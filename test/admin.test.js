/**
 * API administrativa (/api/admin): autenticação, validação, leituras e ações de encaminhamento,
 * com o app Express real + PostgreSQL de teste + OpenAI e Evolution falsas.
 */
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startFakeOpenAI, startFakeEvolution } = require('./helpers/fakeServers');
const { startTestApp } = require('./helpers/testEnv');
const { textPayload, postWebhook } = require('./helpers/webhook');

const TOKEN = 'token-de-teste-com-mais-de-32-caracteres-123';

let openai;
let evolution;
let env;
let phoneCounter = 0;
const newPhone = () => `55118${String(Date.now()).slice(-5)}${String((phoneCounter += 1)).padStart(3, '0')}`;

/** Chamada à API com o token correto (ou o informado em `token`). */
async function api(path, { method = 'GET', body, token = TOKEN } = {}) {
  const headers = {};
  if (token !== null) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${env.url}/api/admin${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, headers: res.headers, body: await res.json() };
}

/** Cria um atendimento real: o paciente escreve e o agente (OpenAI falsa) responde. */
async function newConversation() {
  const phone = newPhone();
  const res = await postWebhook(env.url, textPayload({ phone, text: 'Olá, quero marcar uma avaliação' }));
  assert.equal(res.status, 200);
  const session = await env.prisma.chatSession.findFirst({ where: { user: { phone } }, orderBy: { startedAt: 'desc' } });
  return { phone, session };
}

before(async () => {
  openai = await startFakeOpenAI();
  evolution = await startFakeEvolution();
  env = await startTestApp({ name: 'admin', openaiUrl: openai.url, evolutionUrl: evolution.url, env: { ADMIN_API_TOKEN: TOKEN } });
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

describe('autenticação', () => {
  it('recusa pedidos sem token ou com token errado (401) e não guarda em cache', async () => {
    const missing = await api('/health', { token: null });
    assert.equal(missing.status, 401);
    assert.equal(missing.body.error, 'unauthorized');
    assert.equal(missing.headers.get('cache-control'), 'no-store');
    const wrong = await api('/health', { token: 'outro-token-qualquer-com-tamanho-suficiente' });
    assert.equal(wrong.status, 401);
  });

  it('aceita o token correto', async () => {
    const res = await api('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });
  });
});

describe('leituras', () => {
  it('responde todas as rotas de consulta com JSON', async () => {
    const { session } = await newConversation();
    for (const path of ['/overview?period=7d', '/conversations', '/appointments', '/patients', '/reports?period=30d', '/integrations', '/settings', '/notifications']) {
      const res = await api(path);
      assert.equal(res.status, 200, `${path} → ${res.status} ${JSON.stringify(res.body)}`);
      assert.equal(typeof res.body, 'object');
    }
    const list = await api('/conversations');
    assert.ok(list.body.items.some((c) => c.id === session.id), 'conversa criada não aparece na lista');
    const detail = await api(`/conversations/${session.id}`);
    assert.equal(detail.status, 200);
    assert.ok(JSON.stringify(detail.body).includes('Olá, quero marcar uma avaliação'));
  });

  it('não expõe o telefone completo do paciente', async () => {
    const { phone } = await newConversation();
    const res = await api('/patients');
    assert.equal(res.status, 200);
    assert.ok(!JSON.stringify(res.body).includes(phone), 'telefone completo exposto');
  });

  it('valida parâmetros (400) e ids inexistentes (404)', async () => {
    assert.equal((await api('/overview?period=1d')).status, 400);
    assert.equal((await api('/appointments?from=2026-02-30')).status, 400);
    assert.equal((await api('/appointments?from=2026-03-10&to=2026-03-01')).status, 400);
    assert.equal((await api('/conversations?limit=abc')).status, 400);
    assert.equal((await api('/conversations?status=qualquer')).status, 400);
    assert.equal((await api('/conversations/nao-e-um-uuid')).status, 404);
    assert.equal((await api('/conversations/00000000-0000-4000-8000-000000000000')).status, 404);
    assert.equal((await api('/rota-que-nao-existe')).status, 404);
  });
});

describe('ações', () => {
  it('assumir, devolver e encerrar mudam o encaminhamento; conversa encerrada não pode ser assumida', async () => {
    const { session } = await newConversation();
    const path = `/conversations/${session.id}/handoff`;

    assert.equal((await api(path, { method: 'POST', body: { action: 'assumir' } })).status, 200);
    let row = await env.prisma.chatSession.findUnique({ where: { id: session.id } });
    assert.equal(row.handoffStatus, 'HUMAN_ACTIVE');
    assert.ok(row.humanActiveUntil > new Date());

    assert.equal((await api(path, { method: 'POST', body: { action: 'devolver' } })).status, 200);
    row = await env.prisma.chatSession.findUnique({ where: { id: session.id } });
    assert.equal(row.handoffStatus, 'NONE');
    assert.equal(row.humanActiveUntil, null);

    assert.equal((await api(path, { method: 'POST', body: { action: 'encerrar' } })).status, 200);
    row = await env.prisma.chatSession.findUnique({ where: { id: session.id } });
    assert.equal(row.status, 'CLOSED');

    const again = await api(path, { method: 'POST', body: { action: 'assumir' } });
    assert.equal(again.status, 409);
    assert.equal(again.body.error, 'conversation_closed');
    assert.equal((await api(path, { method: 'POST', body: { action: 'apagar' } })).status, 400);
  });

  it('mensagem da equipe é enviada pela Evolution, gravada como STAFF e pausa o agente', async () => {
    const { phone, session } = await newConversation();
    const res = await api(`/conversations/${session.id}/messages`, { method: 'POST', body: { text: 'Oi! Aqui é a recepção.' } });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.ok(evolution.sent.some((m) => m.number.includes(phone.slice(-8)) && m.text === 'Oi! Aqui é a recepção.'));
    const staff = await env.prisma.message.findFirst({ where: { sessionId: session.id, role: 'STAFF' } });
    assert.equal(staff?.content, 'Oi! Aqui é a recepção.');
    const row = await env.prisma.chatSession.findUnique({ where: { id: session.id } });
    assert.equal(row.handoffStatus, 'HUMAN_ACTIVE');
  });

  it('falha no envio devolve 502 e nada é gravado', async () => {
    const { session } = await newConversation();
    evolution.setFailSend(500);
    const res = await api(`/conversations/${session.id}/messages`, { method: 'POST', body: { text: 'Teste de falha' } });
    evolution.setFailSend(null);
    assert.equal(res.status, 502);
    assert.equal(await env.prisma.message.count({ where: { sessionId: session.id, role: 'STAFF' } }), 0);
  });

  it('recusa mensagem vazia, longa demais ou corpo inválido', async () => {
    const { session } = await newConversation();
    const path = `/conversations/${session.id}/messages`;
    const sentBefore = evolution.sent.length;
    assert.equal((await api(path, { method: 'POST', body: { text: '   ' } })).status, 400);
    assert.equal((await api(path, { method: 'POST', body: { text: 'a'.repeat(2001) } })).status, 400);
    assert.equal((await api(path, { method: 'POST', body: [] })).status, 400);
    assert.equal(evolution.sent.length, sentBefore);
  });
});
