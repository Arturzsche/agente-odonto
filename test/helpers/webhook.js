/** Payloads no formato da Evolution (messages.upsert) e envio para o /webhook do app. */

let counter = 0;
const nextId = (prefix) => {
  counter += 1;
  return `${prefix}${Date.now().toString(36).toUpperCase()}${counter}`;
};

/** Mensagem de texto. `fromMe: true` = enviada pelo número da clínica. */
function textPayload({ phone, text, id = nextId('MSG'), fromMe = false, pushName = 'Ana Paciente', jid }) {
  return {
    event: 'messages.upsert',
    instance: 'clinica',
    data: {
      key: { remoteJid: jid || `${phone}@s.whatsapp.net`, fromMe, id },
      pushName: fromMe ? 'Clínica Sorriso Ideal' : pushName,
      message: { conversation: text },
      messageType: 'conversation',
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
  };
}

/** Áudio (ptt) enviado pela clínica: a equipe gravou um áudio no celular. */
function audioPayload({ phone, id = nextId('AUD'), fromMe = true }) {
  return {
    event: 'messages.upsert',
    instance: 'clinica',
    data: {
      key: { remoteJid: `${phone}@s.whatsapp.net`, fromMe, id },
      pushName: 'Clínica Sorriso Ideal',
      message: { audioMessage: { mimetype: 'audio/ogg; codecs=opus', seconds: 4, ptt: true } },
      messageType: 'audioMessage',
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
  };
}

/** POST /webhook?sync=1 (aguarda o processamento e devolve o JSON). */
async function postWebhook(appUrl, payload, { sync = true } = {}) {
  const res = await fetch(`${appUrl}/webhook${sync ? '?sync=1' : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json() };
}

module.exports = { textPayload, audioPayload, postWebhook, nextId };
