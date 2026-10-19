const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

const { baseUrl, apiKey, instance } = config.evolution;
const simulationMode = !baseUrl;

const http = axios.create({
  baseURL: baseUrl,
  timeout: 30_000,
  headers: { apikey: apiKey, 'Content-Type': 'application/json' },
});

if (simulationMode) {
  logger.warn('[evolution] EVOLUTION_API_URL vazio: MODO SIMULAÇÃO (respostas apenas no log).');
}

/**
 * Obtém o áudio de uma mensagem em Buffer.
 * 1) Se o webhook já trouxe o base64 (opção "Webhook Base64" ligada na Evolution), usa direto.
 * 2) Senão, pede à Evolution: POST /chat/getBase64FromMediaMessage/{instance}.
 */
async function downloadMedia(data) {
  const inlineBase64 = data?.message?.base64;
  if (inlineBase64) {
    return {
      buffer: Buffer.from(inlineBase64, 'base64'),
      mimetype: data.message.audioMessage?.mimetype || 'audio/ogg',
    };
  }

  if (simulationMode) {
    throw new Error('Modo simulação: envie "message.base64" no payload para testar áudio.');
  }

  const { data: res } = await http.post(`/chat/getBase64FromMediaMessage/${instance}`, {
    message: { key: { id: data.key.id } },
    convertToMp4: false,
  });

  if (!res?.base64) throw new Error('Evolution API não retornou o base64 da mídia.');
  return {
    buffer: Buffer.from(res.base64, 'base64'),
    mimetype: res.mimetype || data.message?.audioMessage?.mimetype || 'audio/ogg',
  };
}

/** Envia uma mensagem de texto: POST /message/sendText/{instance}. */
async function sendText(number, text) {
  if (simulationMode) {
    logger.info(`[evolution][SIMULAÇÃO] -> ${number}: ${text}`);
    return { simulated: true };
  }

  const { data } = await http.post(`/message/sendText/${instance}`, {
    number,
    text,
    delay: 1200, // mostra "digitando..." por ~1s, deixa a conversa mais humana
  });
  logger.info(`[evolution] Mensagem enviada para ${number}`);
  return data;
}

module.exports = { downloadMedia, sendText, simulationMode };
