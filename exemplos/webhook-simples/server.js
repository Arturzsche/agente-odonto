/**
 * Webhook mínimo da Evolution API v2 — Clínica Odontológica Sorriso Ideal.
 *
 * Recebe o evento messages.upsert, extrai remetente/nome/texto, ignora mensagens do próprio
 * bot e responde via POST /message/sendText/{instancia}.
 *
 * Requisitos: Node.js 18+ (usa o fetch nativo) e `npm install express`.
 * Rodar:      node server.js
 */
const express = require('express');

// ---------------------------------------------------------------------------
// Configuração (variáveis de ambiente com valores padrão para desenvolvimento)
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 3001;
const EVOLUTION_URL = (process.env.EVOLUTION_API_URL || 'http://localhost:8080').replace(/\/+$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE = process.env.EVOLUTION_INSTANCE || 'clinica';
// Token opcional: se definido, só aceita webhooks que tragam o header "x-webhook-token" igual.
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || '';

if (!EVOLUTION_API_KEY) {
  console.warn('[aviso] EVOLUTION_API_KEY vazia: o envio de respostas vai falhar com 401.');
}

// ---------------------------------------------------------------------------
// Extração segura dos dados do payload
// ---------------------------------------------------------------------------

/** Pega o texto de qualquer tipo de mensagem que tenha texto (simples, com link/citação, legenda). */
function extractText(message = {}) {
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.buttonsResponseMessage?.selectedDisplayText ||
    message.listResponseMessage?.title ||
    ''
  ).trim();
}

/**
 * Normaliza o payload da Evolution. Retorna null para tudo que deve ser ignorado.
 * Formato esperado (v2):
 * { event: "messages.upsert", instance: "clinica",
 *   data: { key: { remoteJid, fromMe, id }, pushName, messageType, message: {...} } }
 */
function parseIncomingMessage(body) {
  const event = String(body?.event || '').toLowerCase().replace(/_/g, '.');
  if (event !== 'messages.upsert') return { ignore: 'evento não é messages.upsert' };

  const data = Array.isArray(body.data) ? body.data[0] : body.data;
  const key = data?.key;
  if (!key?.remoteJid) return { ignore: 'payload sem remoteJid' };

  // Anti-loop: mensagens enviadas pelo próprio número (inclusive as respostas do bot)
  // também geram messages.upsert, com fromMe = true.
  if (key.fromMe === true) return { ignore: 'mensagem enviada pelo próprio bot (fromMe)' };

  // Contatos com número oculto chegam como "@lid"; o número real, quando conhecido, vem em remoteJidAlt.
  const remoteJid = key.remoteJid.endsWith('@lid') && key.remoteJidAlt ? key.remoteJidAlt : key.remoteJid;

  // Só conversas individuais: ignora grupos (@g.us), status (status@broadcast) e canais (@newsletter).
  if (!remoteJid.endsWith('@s.whatsapp.net') && !remoteJid.endsWith('@lid')) {
    return { ignore: `origem não suportada (${remoteJid})` };
  }

  const text = extractText(data.message);
  return {
    messageId: key.id,
    remoteJid,
    // A Evolution aceita o número puro; para @lid sem número real, envia-se o JID completo.
    number: remoteJid.endsWith('@lid') ? remoteJid : remoteJid.split('@')[0],
    name: (data.pushName || '').trim() || 'Paciente',
    messageType: data.messageType || 'desconhecido',
    text,
  };
}

// Evita responder duas vezes se a Evolution reenviar o mesmo webhook (retentativas).
const recentIds = new Set();
function isDuplicate(id) {
  if (!id) return false;
  if (recentIds.has(id)) return true;
  recentIds.add(id);
  if (recentIds.size > 1000) recentIds.delete(recentIds.values().next().value);
  return false;
}

// ---------------------------------------------------------------------------
// Envio de resposta pela Evolution API
// ---------------------------------------------------------------------------
async function sendText(number, text) {
  const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
    body: JSON.stringify({
      number,
      text,
      delay: 1200, // mostra "digitando..." por ~1,2 s antes de enviar
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Evolution respondeu ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Regras de atendimento (ponto onde depois entra a IA)
// ---------------------------------------------------------------------------
function buildReply({ name, text, messageType }) {
  const firstName = name.split(' ')[0];

  if (!text) {
    // Áudio, figurinha, documento etc. — sem texto para interpretar neste exemplo.
    return `Oi, ${firstName}! Por enquanto consigo ler apenas mensagens de texto 🙂 Pode me escrever como posso ajudar?`;
  }

  const t = text.toLowerCase();
  if (/(dor|inchad|sangr|quebr)/.test(t)) {
    return `Sinto muito, ${firstName} 💙 Isso pode ser uma emergência: vou priorizar seu atendimento. Qual o melhor horário para você vir hoje?`;
  }
  if (/(valor|preço|preco|quanto custa)/.test(t)) {
    return 'A avaliação inicial custa R$ 150,00. Valores de tratamentos são definidos após a avaliação, combinado? 😊';
  }
  if (/(agend|marcar|horário|horario|consulta)/.test(t)) {
    return `Claro, ${firstName}! Qual dia e período (manhã ou tarde) ficam melhores para sua avaliação?`;
  }
  return `Olá, ${firstName}! 😊 Sou a assistente da Clínica Sorriso Ideal. Posso ajudar com agendamentos, valores ou alguma dor que esteja sentindo?`;
}

// ---------------------------------------------------------------------------
// Servidor
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json({ limit: '10mb' })); // body-parser já vem embutido no Express 4.16+

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/webhook', (req, res) => {
  if (WEBHOOK_TOKEN && req.get('x-webhook-token') !== WEBHOOK_TOKEN) {
    return res.status(401).json({ ok: false, error: 'token inválido' });
  }

  let msg;
  try {
    msg = parseIncomingMessage(req.body);
  } catch (err) {
    console.error('[webhook] payload inválido:', err.message);
    return res.status(400).json({ ok: false });
  }

  if (msg.ignore) return res.status(200).json({ ok: true, ignored: msg.ignore });
  if (isDuplicate(msg.messageId)) return res.status(200).json({ ok: true, ignored: 'duplicada' });

  // Responde 200 na hora: se o webhook demorar, a Evolution considera falha e reenvia.
  res.status(200).json({ ok: true });

  console.log(`[recebida] ${msg.name} (${msg.number}) [${msg.messageType}]: ${msg.text || '(sem texto)'}`);

  // Processamento em segundo plano, isolado em try/catch para nunca derrubar o servidor.
  (async () => {
    try {
      const reply = buildReply(msg);
      await sendText(msg.number, reply);
      console.log(`[enviada]  -> ${msg.number}: ${reply}`);
    } catch (err) {
      console.error(`[erro] falha ao responder ${msg.number}: ${err.message}`);
    }
  })();
});

// JSON malformado e outros erros do Express.
app.use((err, req, res, next) => {
  console.error('[server] erro:', err.message);
  res.status(err.status || 500).json({ ok: false });
});

app.listen(PORT, () => {
  console.log(`Webhook ouvindo em http://localhost:${PORT}/webhook (instância "${INSTANCE}")`);
});
