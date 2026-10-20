/**
 * Regressões do fluxo do webhook (texto -> resposta, deduplicação, grupos ignorados),
 * com o app Express real, PostgreSQL de teste e OpenAI/Evolution falsas.
 */
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startFakeOpenAI, startFakeEvolution } = require('./helpers/fakeServers');
const { startTestApp } = require('./helpers/testEnv');
const { textPayload, postWebhook, nextId } = require('./helpers/webhook');

let openai;
let evolution;
let env;
let phoneCounter = 0;
const newPhone = () => `55219${String(Date.now()).slice(-5)}${String((phoneCounter += 1)).padStart(3, '0')}`;

before(async () => {
  openai = await startFakeOpenAI();
  evolution = await startFakeEvolution();
  env = await startTestApp({ name: 'webhook', openaiUrl: openai.url, evolutionUrl: evolution.url });
});

after(async () => {
  await env?.close();
  await openai?.close();
  await evolution?.close();
});

beforeEach(() => {
  openai.reset();
  evolution.reset();
});

describe('webhook (regressões)', () => {
  it('GET /health responde', async () => {
    const res = await fetch(`${env.url}/health`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'ok');
  });

  it('texto do paciente -> resposta da IA enviada e gravada com o ID do WhatsApp', async () => {
    const phone = newPhone();
    openai.enqueue({ content: 'Oi, Ana! Como posso te ajudar hoje?' });
    const { status, body } = await postWebhook(env.url, textPayload({ phone, text: 'Oi, boa tarde' }));
    assert.equal(status, 200);
    assert.equal(body.reply, 'Oi, Ana! Como posso te ajudar hoje?');

    assert.equal(evolution.sent.length, 1);
    assert.equal(evolution.sent[0].number, phone);
    assert.equal(evolution.sent[0].instance, 'clinica');

    // A IA recebeu o prompt de sistema e a mensagem do paciente.
    const { messages, tools } = openai.requests[0];
    assert.equal(messages[0].role, 'system');
    assert.deepEqual(messages.at(-1), { role: 'user', content: 'Oi, boa tarde' });
    assert.ok(tools.some((t) => t.function.name === 'encaminhar_para_equipe'));

    const msgs = await env.prisma.message.findMany({ where: { user: { phone } }, orderBy: { createdAt: 'asc' } });
    assert.deepEqual(
      msgs.map((m) => m.role),
      ['USER', 'ASSISTANT'],
    );
    assert.equal(msgs[1].externalId, evolution.sent[0].id);
    const user = await env.prisma.user.findFirst({ where: { phone } });
    assert.equal(user.name, 'Ana Paciente');
  });

  it('evento duplicado (mesmo ID) é ignorado', async () => {
    const phone = newPhone();
    const payload = textPayload({ phone, text: 'Quero marcar uma avaliação', id: nextId('DUP') });
    const first = await postWebhook(env.url, payload);
    const second = await postWebhook(env.url, payload);
    assert.equal(first.body.reply, openai.DEFAULT_REPLY);
    assert.equal(second.body.reply, null);
    assert.equal(evolution.sent.length, 1);
    assert.equal(openai.requests.length, 1);
  });

  it('mensagens de grupo e de status são ignoradas (inclusive fromMe)', async () => {
    const group = await postWebhook(
      env.url,
      textPayload({ phone: 'x', jid: '120363000000000000@g.us', text: 'Oi grupo' }),
    );
    assert.deepEqual(group.body, { ok: true, ignored: true });

    const groupFromMe = await postWebhook(
      env.url,
      textPayload({ phone: 'x', jid: '120363000000000000@g.us', text: 'Oi grupo', fromMe: true }),
    );
    assert.deepEqual(groupFromMe.body, { ok: true, ignored: true });

    const status = await postWebhook(env.url, textPayload({ phone: 'x', jid: 'status@broadcast', text: 'status' }));
    assert.deepEqual(status.body, { ok: true, ignored: true });

    assert.equal(evolution.sent.length, 0);
    assert.equal(openai.requests.length, 0);
  });

  it('outros eventos da Evolution são ignorados', async () => {
    const res = await postWebhook(env.url, { event: 'connection.update', data: { state: 'open' } });
    assert.deepEqual(res.body, { ok: true, ignored: true });
  });

  it('falha na OpenAI -> paciente recebe a mensagem de fallback', async () => {
    const phone = newPhone();
    openai.enqueue({ status: 400 });
    const { body } = await postWebhook(env.url, textPayload({ phone, text: 'Oi' }));
    assert.match(body.reply, /instabilidade/);
    assert.equal(evolution.sent.at(-1).text, body.reply);
  });
});
