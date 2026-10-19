/**
 * Simula a Evolution API enviando um webhook para o agente.
 *   Texto: node scripts/simular-webhook.js "Oi, quero marcar uma consulta"
 *   Áudio: node scripts/simular-webhook.js --audio ./meu-audio.ogg
 * Opcional: PHONE=5511988887777 para simular outro paciente.
 */
require('dotenv').config();
const fs = require('fs');
const axios = require('axios');

const url = `http://localhost:${process.env.PORT || 3000}/webhook?sync=1`;
const phone = process.env.PHONE || '5511999999999';
const args = process.argv.slice(2);

const base = {
  event: 'messages.upsert',
  instance: process.env.EVOLUTION_INSTANCE || 'clinica',
  data: {
    key: { remoteJid: `${phone}@s.whatsapp.net`, fromMe: false, id: `SIM-${Date.now()}` },
    pushName: 'Paciente Teste',
  },
};

if (args[0] === '--audio') {
  const audio = fs.readFileSync(args[1]);
  base.data.messageType = 'audioMessage';
  base.data.message = {
    audioMessage: { mimetype: 'audio/ogg; codecs=opus', ptt: true },
    base64: audio.toString('base64'),
  };
} else {
  base.data.messageType = 'conversation';
  base.data.message = { conversation: args.join(' ') || 'Olá!' };
}

axios
  .post(url, base, { timeout: 120_000 })
  .then(({ data }) => console.log('\n🤖 Resposta da IA:\n', data.reply ?? data))
  .catch((err) => console.error('Erro:', err.response?.data || err.message));
