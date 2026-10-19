/**
 * Cria (se preciso) a instância na Evolution API e mostra o QR Code para conectar o WhatsApp.
 *   npm run whatsapp:conectar
 * O QR é salvo em ./qrcode.png e aberto automaticamente. Escaneie em
 * WhatsApp > Aparelhos conectados > Conectar um aparelho.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');

const baseURL = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
const apiKey = process.env.EVOLUTION_API_KEY;
const instance = process.env.EVOLUTION_INSTANCE || 'clinica';
const qrPath = path.resolve('qrcode.png');

if (!baseURL || !apiKey) {
  console.error('❌ Preencha EVOLUTION_API_URL e EVOLUTION_API_KEY no .env antes de conectar.');
  process.exit(1);
}

const api = axios.create({ baseURL, headers: { apikey: apiKey }, timeout: 30_000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getState() {
  try {
    const { data } = await api.get(`/instance/connectionState/${instance}`);
    return data?.instance?.state || 'close';
  } catch (err) {
    if (err.response?.status === 404) return null; // instância não existe
    throw err;
  }
}

async function requestQr(exists) {
  if (!exists) {
    const { data } = await api.post('/instance/create', {
      instanceName: instance,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
    });
    console.log(`✅ Instância "${instance}" criada.`);
    return data?.qrcode;
  }
  const { data } = await api.get(`/instance/connect/${instance}`);
  return data;
}

function saveAndOpenQr(qr) {
  if (!qr?.base64) return false;
  fs.writeFileSync(qrPath, Buffer.from(qr.base64.split(',').pop(), 'base64'));
  const opener =
    process.platform === 'win32' ? `start "" "${qrPath}"` : process.platform === 'darwin' ? `open "${qrPath}"` : `xdg-open "${qrPath}"`;
  exec(opener, () => {});
  console.log(`📱 QR Code salvo em ${qrPath} — escaneie em WhatsApp > Aparelhos conectados.`);
  if (qr.pairingCode) console.log(`   (ou use o código de pareamento: ${qr.pairingCode})`);
  return true;
}

(async () => {
  try {
    const state = await getState();
    if (state === 'open') {
      console.log(`✅ A instância "${instance}" já está conectada ao WhatsApp.`);
      return;
    }

    let qrShown = saveAndOpenQr(await requestQr(state !== null));
    const deadline = Date.now() + 3 * 60_000;
    let lastQrAt = Date.now();

    while (Date.now() < deadline) {
      await sleep(3000);
      if ((await getState()) === 'open') {
        console.log('🎉 WhatsApp conectado! O agente já pode receber mensagens.');
        fs.rmSync(qrPath, { force: true });
        return;
      }
      // O QR do WhatsApp expira; pede um novo a cada ~40s (ou se ainda não veio nenhum).
      if (!qrShown || Date.now() - lastQrAt > 40_000) {
        qrShown = saveAndOpenQr(await requestQr(true)) || qrShown;
        lastQrAt = Date.now();
      }
    }
    console.log('⏰ Tempo esgotado. Rode "npm run whatsapp:conectar" de novo.');
  } catch (err) {
    const detail = err.response ? `${err.response.status} ${JSON.stringify(err.response.data)}` : err.message;
    console.error(`❌ Falha ao falar com a Evolution API (${baseURL}): ${detail}`);
    if (err.code === 'ECONNREFUSED') console.error('   Ela está rodando? Use: docker compose up -d');
    process.exitCode = 1;
  }
})();
