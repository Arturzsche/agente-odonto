/**
 * Servidores HTTP falsos (Express) que imitam a OpenAI e a Evolution API nos testes.
 * Nada sai da máquina: OPENAI_BASE_URL e EVOLUTION_API_URL apontam para cá.
 */
const express = require('express');

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const close = (server) => new Promise((resolve) => server.close(resolve));

/**
 * OpenAI falsa e programável.
 * - enqueue(step): a próxima chamada de /chat/completions usa `step`, que pode ser
 *   { content } (texto final), { toolCalls: [{ name, arguments }] }, { status } (erro HTTP)
 *   ou uma função (body) => step.
 *   Sem nada na fila, responde DEFAULT_REPLY.
 * - requests: corpos recebidos (para conferir histórico, mensagens de sistema etc.).
 */
async function startFakeOpenAI() {
  const DEFAULT_REPLY = 'Olá! Sou a Sofia, como posso ajudar?';
  const queue = [];
  const requests = [];
  let callCounter = 0;

  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.post('/v1/chat/completions', (req, res) => {
    requests.push(req.body);
    let step = queue.shift() || { content: DEFAULT_REPLY };
    if (typeof step === 'function') step = step(req.body);
    // { status: 400 } simula um erro da API (4xx não é repetido pelo SDK).
    if (step.status) {
      return res.status(step.status).json({ error: { message: 'erro simulado', type: 'invalid_request_error' } });
    }

    const message = { role: 'assistant', content: step.content ?? null };
    if (step.toolCalls) {
      message.tool_calls = step.toolCalls.map((call) => {
        callCounter += 1;
        return {
          id: `call_${callCounter}`,
          type: 'function',
          function: {
            name: call.name,
            arguments: typeof call.arguments === 'string' ? call.arguments : JSON.stringify(call.arguments || {}),
          },
        };
      });
    }

    res.json({
      id: `chatcmpl-teste-${requests.length}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: req.body.model,
      choices: [{ index: 0, message, finish_reason: step.toolCalls ? 'tool_calls' : 'stop', logprobs: null }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
  });

  // Whisper: devolve sempre a mesma transcrição.
  app.post('/v1/audio/transcriptions', (req, res) => {
    req.resume();
    req.on('end', () => res.json({ text: 'transcrição de teste' }));
  });

  const server = await listen(app);
  return {
    url: `http://127.0.0.1:${server.address().port}/v1`,
    DEFAULT_REPLY,
    requests,
    enqueue: (...steps) => queue.push(...steps),
    reset() {
      queue.length = 0;
      requests.length = 0;
    },
    close: () => close(server),
  };
}

/**
 * Evolution falsa: registra cada sendText em `sent` e devolve um key.id único, como a real.
 * `onSend` (opcional) roda ANTES de a resposta do sendText ser devolvida, para simular o eco
 * "fromMe" chegando pelo webhook antes de o agente saber o ID da mensagem.
 * `setFailSend(status)` faz os próximos sendText falharem com esse status HTTP (null = normal).
 * `setConnectionState(state)` define o que GET /instance/connectionState devolve ('open',
 * 'connecting', 'close'; um número simula erro HTTP). `apiKeys` guarda o header apikey recebido.
 */
async function startFakeEvolution() {
  const sent = [];
  const apiKeys = [];
  const state = { onSend: null, counter: 0, failSend: null, connectionState: 'open' };

  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use((req, res, next) => {
    apiKeys.push(req.get('apikey'));
    next();
  });

  app.get('/instance/connectionState/:instance', (req, res) => {
    if (typeof state.connectionState === 'number') {
      return res.status(state.connectionState).json({ error: 'erro simulado' });
    }
    res.json({ instance: { instanceName: req.params.instance, state: state.connectionState } });
  });

  app.post('/message/sendText/:instance', async (req, res) => {
    if (state.failSend) {
      return res.status(state.failSend).json({ status: state.failSend, error: 'erro simulado' });
    }
    state.counter += 1;
    const id = `AGENTE${String(state.counter).padStart(6, '0')}`;
    const entry = { instance: req.params.instance, number: req.body.number, text: req.body.text, id };
    sent.push(entry);
    if (state.onSend) await state.onSend(entry);
    res.status(201).json({
      key: { remoteJid: `${req.body.number}@s.whatsapp.net`, fromMe: true, id },
      message: { conversation: req.body.text },
      messageTimestamp: Math.floor(Date.now() / 1000),
      status: 'PENDING',
    });
  });

  app.post('/chat/sendPresence/:instance', (req, res) => res.json({ ok: true }));

  const server = await listen(app);
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    sent,
    apiKeys,
    setOnSend(fn) {
      state.onSend = fn;
    },
    setFailSend(status) {
      state.failSend = status;
    },
    setConnectionState(value) {
      state.connectionState = value;
    },
    reset() {
      sent.length = 0;
      apiKeys.length = 0;
      state.onSend = null;
      state.failSend = null;
      state.connectionState = 'open';
    },
    close: () => close(server),
  };
}

module.exports = { startFakeOpenAI, startFakeEvolution };
