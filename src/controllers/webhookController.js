const db = require('../database');
const openaiService = require('../services/openaiService');
const evolutionService = require('../services/evolutionService');
const logger = require('../utils/logger');

const FALLBACK_REPLY =
  'Desculpe, tive uma instabilidade aqui 😕. Pode me enviar sua mensagem novamente em instantes?';
const AUDIO_FAIL_REPLY =
  'Não consegui ouvir seu áudio 😕. Pode me contar por texto, por favor?';
const UNSUPPORTED_REPLY =
  'No momento consigo entender apenas mensagens de texto e áudio 🙂. Como posso te ajudar?';

// Fila por paciente: mensagens do mesmo número são processadas em ordem, uma de cada vez,
// evitando respostas fora de ordem quando o paciente manda várias mensagens seguidas.
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

/** Extrai do payload da Evolution apenas o que interessa. Retorna null se for para ignorar. */
function parsePayload(body) {
  const event = String(body?.event || '').toLowerCase().replace('_', '.');
  if (event && event !== 'messages.upsert') return null;

  const data = Array.isArray(body?.data) ? body.data[0] : body?.data;
  const key = data?.key;
  if (!key?.remoteJid || key.fromMe) return null;

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

  return {
    data,
    messageId: key.id,
    remoteJid: jid,
    // Sem número real (@lid), a Evolution aceita o JID completo como destino.
    phone: jid.endsWith('@lid') ? jid : jid.split('@')[0],
    pushName: data.pushName,
    type,
    text: text?.trim() || null,
  };
}

/** Pipeline completo de uma mensagem. Nunca lança: erros viram mensagem de fallback. */
async function processMessage(msg) {
  const { remoteJid, phone, type } = msg;

  const isNew = await db.markEventProcessed(msg.messageId);
  if (!isNew) {
    logger.info(`[webhook] Mensagem ${msg.messageId} duplicada, ignorando.`);
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
  const history = await db.getHistory(session.id);

  // 4) IA + function calling
  let reply;
  try {
    reply = await openaiService.generateReply(history, {
      remoteJid,
      phone,
      pushName: msg.pushName,
      userId: user.id,
      sessionId: session.id,
    });
  } catch (err) {
    logger.error(`[webhook] Falha na OpenAI para ${phone}:`, err.message);
    await safeSend(phone, FALLBACK_REPLY);
    return FALLBACK_REPLY;
  }
  if (!reply) reply = FALLBACK_REPLY;

  // 5) Enviar ao paciente e salvar a resposta (com o ID que o WhatsApp deu à mensagem enviada)
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
