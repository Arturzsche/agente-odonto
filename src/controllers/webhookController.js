const db = require('../database');
const config = require('../config');
const { isUniqueViolation } = require('../database/errors');
const openaiService = require('../services/openaiService');
const evolutionService = require('../services/evolutionService');
const sentMessages = require('../services/sentMessageRegistry');
const logger = require('../utils/logger');

const FALLBACK_REPLY =
  'Desculpe, tive uma instabilidade aqui 😕. Pode me enviar sua mensagem novamente em instantes?';
const AUDIO_FAIL_REPLY =
  'Não consegui ouvir seu áudio 😕. Pode me contar por texto, por favor?';
const UNSUPPORTED_REPLY =
  'No momento consigo entender apenas mensagens de texto e áudio 🙂. Como posso te ajudar?';

// Tipos que não trazem conteúdo novo (apagar/editar mensagem, reação, enquete etc.).
// Mensagens da equipe desses tipos não contam como "assumir a conversa".
const NON_CONTENT_TYPES = new Set([
  'protocolMessage',
  'reactionMessage',
  'editedMessage',
  'pollUpdateMessage',
  'senderKeyDistributionMessage',
]);

// Marcadores gravados no lugar de mídias que não são transcritas (o painel mostra o texto).
const MEDIA_MARKERS = {
  audio: { label: 'áudio', female: false },
  image: { label: 'imagem', female: true },
  video: { label: 'vídeo', female: false },
  document: { label: 'documento', female: false },
  sticker: { label: 'figurinha', female: true },
  location: { label: 'localização', female: true },
  contact: { label: 'contato', female: false },
  other: { label: 'mensagem', female: true },
};
/** Ex.: mediaMarker('audio', 'equipe') -> "[áudio enviado pela equipe]". */
function mediaMarker(kind, author) {
  const { label, female } = MEDIA_MARKERS[kind] || MEDIA_MARKERS.other;
  const by = author === 'equipe' ? 'pela equipe' : 'pelo paciente';
  return `[${label} ${female ? 'enviada' : 'enviado'} ${by}]`;
}

const PATIENT_AUDIO_NOT_TRANSCRIBED = '[áudio enviado pelo paciente, não foi possível transcrever]';

// Fila por paciente: mensagens do mesmo número são processadas em ordem, uma de cada vez,
// evitando respostas fora de ordem quando o paciente manda várias mensagens seguidas.
// As mensagens da equipe (fromMe) da mesma conversa entram na mesma fila.
const queues = new Map();
function enqueue(remoteJid, task) {
  const previous = queues.get(remoteJid) || Promise.resolve();
  const current = previous.then(task, task);
  queues.set(remoteJid, current);
  current.finally(() => {
    if (queues.get(remoteJid) === current) queues.delete(remoteJid);
  });
  return current;
}

/** messageTimestamp da Evolution (segundos, às vezes em texto) como Date, ou null se inválido. */
function parseMessageTimestamp(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n > 1e12 ? n : n * 1000);
}

/** Tipo de mídia da mensagem (para marcadores), ou null se não for mídia conhecida. */
function detectMediaKind(message, messageType) {
  const has = (name) => messageType === name || Boolean(message[name]);
  if (messageType === 'ptt' || has('audioMessage')) return 'audio';
  if (has('imageMessage')) return 'image';
  if (has('videoMessage') || has('ptvMessage')) return 'video';
  if (has('documentMessage') || has('documentWithCaptionMessage')) return 'document';
  if (has('stickerMessage')) return 'sticker';
  if (has('locationMessage') || has('liveLocationMessage')) return 'location';
  if (has('contactMessage') || has('contactsArrayMessage')) return 'contact';
  return null;
}

/**
 * Extrai do payload da Evolution apenas o que interessa. Retorna null se for para ignorar.
 * Mensagens "fromMe" (enviadas pelo número da clínica) também são extraídas, com fromMe: true:
 * podem ser o eco do próprio agente ou a equipe respondendo pelo WhatsApp (ver processFromMe).
 */
function parsePayload(body) {
  const event = String(body?.event || '').toLowerCase().replace('_', '.');
  if (event && event !== 'messages.upsert') return null;

  const data = Array.isArray(body?.data) ? body.data[0] : body?.data;
  const key = data?.key;
  if (!key?.remoteJid) return null;
  const fromMe = Boolean(key.fromMe);

  // Contatos com privacidade de número chegam como "@lid"; quando a Evolution conhece o
  // número real, ele vem em remoteJidAlt.
  const jid = key.remoteJid.endsWith('@lid') && key.remoteJidAlt ? key.remoteJidAlt : key.remoteJid;
  // Ignora grupos, status e newsletters.
  if (!jid.endsWith('@s.whatsapp.net') && !jid.endsWith('@lid')) return null;

  const message = data.message || {};
  const messageType = data.messageType;
  let type = 'unsupported';
  let text = null;

  if (messageType === 'conversation' || message.conversation) {
    type = 'text';
    text = message.conversation;
  } else if (messageType === 'extendedTextMessage' || message.extendedTextMessage) {
    type = 'text';
    text = message.extendedTextMessage?.text;
  } else if (messageType === 'ptt' || messageType === 'audioMessage' || message.audioMessage) {
    type = 'audio';
  }

  const rawType = messageType || Object.keys(message).find((k) => k !== 'messageContextInfo') || null;
  const nonContent = NON_CONTENT_TYPES.has(rawType);
  // Edições, reações e afins da equipe não indicam que ela assumiu a conversa.
  if (fromMe && nonContent) return null;

  const mediaKind = type === 'audio' ? 'audio' : type === 'unsupported' ? detectMediaKind(message, messageType) : null;
  const caption =
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    message.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    null;

  return {
    data,
    messageId: key.id,
    remoteJid: jid,
    // Sem número real (@lid), a Evolution aceita o JID completo como destino.
    phone: jid.endsWith('@lid') ? jid : jid.split('@')[0],
    // Em mensagens fromMe o pushName é o nome da própria clínica: não serve como nome do paciente.
    pushName: fromMe ? undefined : data.pushName,
    fromMe,
    type,
    text: text?.trim() || null,
    mediaKind,
    caption: caption?.trim() || null,
    nonContent,
    sentAt: parseMessageTimestamp(data.messageTimestamp),
  };
}

/**
 * Conversa em atendimento humano (a equipe assumiu e o prazo não venceu): a mensagem do paciente
 * só é registrada para a equipe ver no painel. A IA não é chamada e NADA é enviado (nem fallback).
 */
async function saveWhileHumanActive(msg) {
  const { remoteJid, phone, type } = msg;
  // Reações, edições e afins não acrescentam nada à conversa.
  if (msg.nonContent) return;

  let content = msg.text;
  let messageType = 'TEXT';
  if (type === 'audio') {
    try {
      const { buffer, mimetype } = await evolutionService.downloadMedia(msg.data);
      content = await openaiService.transcribeAudio(buffer, mimetype);
      messageType = 'AUDIO';
    } catch (err) {
      logger.warn(`[webhook] Falha ao transcrever áudio de ${phone} (atendimento humano): ${err.message}`);
    }
    if (!content) {
      content = PATIENT_AUDIO_NOT_TRANSCRIBED;
      messageType = 'TEXT';
    }
  }
  if (!content) {
    content = [mediaMarker(msg.mediaKind, 'paciente'), msg.caption].filter(Boolean).join(' ');
  }

  const user = await db.upsertUser({ remoteJid, phone, name: msg.pushName });
  const session = await db.getOrCreateActiveSession(user.id);
  await db.saveMessage({
    sessionId: session.id,
    userId: user.id,
    role: 'USER',
    type: messageType,
    content,
    externalId: msg.messageId,
  });
  logger.info(`[webhook] ${msg.pushName || phone}: conversa em atendimento humano, mensagem registrada sem resposta do agente.`);
}

/** Pipeline completo de uma mensagem. Nunca lança: erros viram mensagem de fallback. */
async function processMessage(msg) {
  const { remoteJid, phone, type } = msg;

  const isNew = await db.markEventProcessed(msg.messageId);
  if (!isNew) {
    logger.info(`[webhook] Mensagem ${msg.messageId} duplicada, ignorando.`);
    return null;
  }

  // 0) A equipe assumiu esta conversa? Então o agente fica quieto: só registra a mensagem.
  //    (Checado antes de transcrever/responder para não enviar nem as mensagens de fallback.)
  const openSession = await db.findOpenSession(remoteJid);
  if (db.isHumanActive(openSession)) {
    await saveWhileHumanActive(msg);
    return null;
  }

  // 1) Obter o texto (transcrevendo se for áudio)
  let userText = msg.text;
  if (type === 'audio') {
    try {
      const { buffer, mimetype } = await evolutionService.downloadMedia(msg.data);
      userText = await openaiService.transcribeAudio(buffer, mimetype);
      logger.info(`[webhook] Áudio de ${phone} transcrito: "${userText}"`);
    } catch (err) {
      logger.error(`[webhook] Falha ao transcrever áudio de ${phone}:`, err.message);
      await safeSend(phone, AUDIO_FAIL_REPLY);
      return AUDIO_FAIL_REPLY;
    }
  }

  if (type === 'unsupported' || !userText) {
    await safeSend(phone, UNSUPPORTED_REPLY);
    return UNSUPPORTED_REPLY;
  }

  logger.info(`[webhook] ${msg.pushName || phone} (${type}): ${userText}`);

  // 2) Identificar paciente e atendimento, salvar a mensagem e 3) puxar o histórico da sessão
  const user = await db.upsertUser({ remoteJid, phone, name: msg.pushName });
  const session = await db.getOrCreateActiveSession(user.id);
  await db.saveMessage({
    sessionId: session.id,
    userId: user.id,
    role: 'USER',
    type: type === 'audio' ? 'AUDIO' : 'TEXT',
    content: userText,
    externalId: msg.messageId,
  });

  // A equipe pode ter assumido enquanto o áudio era transcrito (ex.: pelo painel). E, se o prazo
  // da pausa já venceu, a conversa volta para o agente.
  let handoffStatus = session.handoffStatus;
  if (handoffStatus === 'HUMAN_ACTIVE') {
    if (db.isHumanActive(session)) {
      logger.info(`[webhook] ${phone}: conversa em atendimento humano, agente não vai responder.`);
      return null;
    }
    await db.releaseExpiredHumanHandoff(session.id);
    handoffStatus = 'NONE';
    logger.info(`[webhook] ${phone}: prazo do atendimento humano venceu, agente voltou a responder.`);
  }

  const history = await db.getHistory(session.id);

  // 4) IA + function calling: aguarda TODAS as ferramentas e só então envia uma única resposta.
  //    Enquanto isso, o paciente vê "digitando...".
  const stopTyping = evolutionService.startTyping(phone);
  let reply;
  try {
    reply = await openaiService.generateReply(history, {
      remoteJid,
      phone,
      pushName: msg.pushName,
      userId: user.id,
      sessionId: session.id,
      handoffStatus,
    });
  } catch (err) {
    logger.error(`[webhook] Falha na OpenAI para ${phone}:`, err.message);
    await safeSend(phone, FALLBACK_REPLY);
    return FALLBACK_REPLY;
  } finally {
    stopTyping();
  }
  if (!reply) reply = FALLBACK_REPLY;

  // A equipe assumiu (pelo painel) enquanto a IA pensava: não atropela a conversa dela.
  if (await db.isSessionHumanActive(session.id)) {
    logger.info(`[webhook] ${phone}: equipe assumiu durante a geração da resposta; resposta descartada.`);
    return null;
  }

  // 5) Enviar ao paciente e salvar a resposta (com o ID que o WhatsApp deu à mensagem enviada).
  //    O sendText registra o ID em memória (sentMessageRegistry) antes de gravarmos no banco.
  const sent = await safeSend(phone, reply);
  await db.saveMessage({
    sessionId: session.id,
    userId: user.id,
    role: 'ASSISTANT',
    content: reply,
    externalId: sent?.key?.id || null,
  });
  return reply;
}

/**
 * A mensagem fromMe foi enviada pelo próprio sistema (agente ou painel)? Heurística (detalhes
 * em services/sentMessageRegistry.js), aplicada só depois de FROM_ME_PROCESS_DELAY_MS e na fila
 * do paciente, quando o envio do agente para esta conversa já terminou e foi gravado:
 *   (b) ID registrado em memória assim que o sendText retornou;
 *   (a) ID já gravado no banco (Message.externalId);
 *   (c) reforço: texto idêntico a uma resposta enviada ao mesmo número nos últimos 2 minutos.
 * Retorna o motivo (para log) ou null quando a mensagem é da equipe.
 */
async function detectSystemEcho(msg) {
  if (sentMessages.isRegisteredSentId(msg.messageId)) return 'ID enviado recentemente';
  if (await db.messageExistsByExternalId(msg.messageId)) return 'ID já registrado';
  if (msg.text) {
    if (sentMessages.wasTextRecentlySent(msg.phone, msg.text)) return 'texto enviado recentemente';
    const since = new Date(Date.now() - sentMessages.TEXT_WINDOW_MS);
    if (await db.hasRecentAssistantText({ remoteJid: msg.remoteJid, content: msg.text, since })) {
      return 'texto enviado recentemente';
    }
  }
  return null;
}

/**
 * Mensagem enviada pelo número da clínica (fromMe). Se não foi o próprio sistema, é a equipe
 * respondendo pelo WhatsApp (celular/WhatsApp Web): grava como STAFF e pausa o agente nessa
 * conversa por HUMAN_TAKEOVER_HOURS (renovado a cada mensagem da equipe).
 * Nunca envia nada ao paciente. Retorna 'duplicada' | 'sistema' | 'equipe'.
 */
async function processFromMe(msg) {
  const { remoteJid, phone } = msg;

  const isNew = await db.markEventProcessed(msg.messageId);
  if (!isNew) {
    logger.info(`[webhook] Mensagem da clínica ${msg.messageId} duplicada, ignorando.`);
    return 'duplicada';
  }

  const echo = await detectSystemEcho(msg);
  if (echo) {
    logger.info(`[webhook] Eco de mensagem enviada pelo agente para ${phone} (${echo}), ignorando.`);
    return 'sistema';
  }

  // Mídia da equipe não é baixada nem transcrita: fica um marcador (com a legenda, se houver).
  const content =
    msg.type === 'text' && msg.text
      ? msg.text
      : [mediaMarker(msg.mediaKind || (msg.type === 'audio' ? 'audio' : 'other'), 'equipe'), msg.caption]
          .filter(Boolean)
          .join(' ');

  // Sem pushName: em mensagens fromMe ele é o nome da clínica, não o do paciente.
  const user = await db.upsertUser({ remoteJid, phone });
  const session = await db.getOrCreateActiveSession(user.id);
  try {
    const { session: updated } = await db.saveStaffMessage({
      sessionId: session.id,
      userId: user.id,
      content,
      externalId: msg.messageId,
      sentAt: msg.sentAt,
    });
    logger.info(
      `[webhook] Equipe respondeu ${phone} pelo WhatsApp da clínica: agente pausado nesta conversa até ${updated.humanActiveUntil.toISOString()}.`,
    );
  } catch (err) {
    // Gravada por outra parte do sistema (ex.: painel) entre a checagem e a gravação.
    if (isUniqueViolation(err)) {
      logger.info(`[webhook] Mensagem da clínica ${msg.messageId} já registrada, ignorando.`);
      return 'sistema';
    }
    throw err;
  }
  return 'equipe';
}

/**
 * Agenda a análise de uma mensagem fromMe: espera FROM_ME_PROCESS_DELAY_MS (o eco do agente pode
 * chegar antes de o sendText retornar o ID) e então entra na fila do paciente, atrás de qualquer
 * resposta do agente ainda em andamento para essa conversa. Nunca rejeita.
 */
function scheduleFromMe(msg) {
  return new Promise((resolve) => {
    setTimeout(() => {
      enqueue(msg.remoteJid, () =>
        processFromMe(msg).catch((err) => {
          logger.error(`[webhook] Erro ao processar mensagem da clínica ${msg.messageId}:`, err);
          return 'erro';
        }),
      ).then(resolve);
    }, config.handoff.fromMeProcessDelayMs);
  });
}

/** Envia texto sem lançar erro. Retorna a resposta da Evolution, ou null se falhar. */
async function safeSend(phone, text) {
  try {
    return await evolutionService.sendText(phone, text);
  } catch (err) {
    const detail = err.response ? `${err.response.status} ${JSON.stringify(err.response.data)}` : err.message;
    logger.error(`[webhook] Falha ao enviar mensagem para ${phone}: ${detail}`);
    return null;
  }
}

/**
 * POST /webhook
 * Responde 200 imediatamente (a Evolution reenvia webhooks lentos) e processa em segundo plano.
 * Use ?sync=1 em testes locais para aguardar e receber a resposta da IA no corpo.
 */
async function handleWebhook(req, res) {
  let msg;
  try {
    msg = parsePayload(req.body);
  } catch (err) {
    logger.error('[webhook] Payload inválido:', err.message);
    return res.status(400).json({ ok: false, error: 'Payload inválido' });
  }

  if (!msg) return res.status(200).json({ ok: true, ignored: true });

  if (msg.fromMe) {
    const fromMeJob = scheduleFromMe(msg);
    if (req.query.sync === '1') {
      const result = await fromMeJob;
      return res.status(200).json({ ok: true, fromMe: true, result });
    }
    return res.status(200).json({ ok: true, queued: true });
  }

  const job = enqueue(msg.remoteJid, () =>
    processMessage(msg).catch(async (err) => {
      // Ex.: PostgreSQL fora do ar. O paciente não fica sem resposta.
      logger.error(`[webhook] Erro inesperado ao processar ${msg.messageId}:`, err);
      await safeSend(msg.phone, FALLBACK_REPLY);
      return FALLBACK_REPLY;
    }),
  );

  if (req.query.sync === '1') {
    const reply = await job;
    return res.status(200).json({ ok: true, reply });
  }
  return res.status(200).json({ ok: true, queued: true });
}

module.exports = { handleWebhook, parsePayload };
