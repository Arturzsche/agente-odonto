const path = require('path');
const { Router } = require('express');
const { handleWebhook } = require('../controllers/webhookController');

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
router.post('/webhook', handleWebhook);
// Interface visual que imita o WhatsApp e envia payloads no formato da Evolution para /webhook.
router.get('/chat-teste', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'chat-teste.html')));
// A Evolution, com "Webhook by Events" ligado, envia para /webhook/messages-upsert.
router.post('/webhook/:event', handleWebhook);

module.exports = router;
