/**
 * Encaminhamento para a equipe e assunção de conversas por humanos (ponta a ponta):
 * app Express real + PostgreSQL de teste + OpenAI e Evolution falsas.
 */
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startFakeOpenAI, startFakeEvolution } = require('./helpers/fakeServers');
const { startTestApp } = require('./helpers/testEnv');
const { textPayload, audioPayload, postWebhook, nextId } = require('./helpers/webhook');

const HOUR = 60 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let openai;
let evolution;
let env;
let phoneCounter = 0;
/** Cada teste usa um paciente diferente. */
const newPhone = () => `55119${String(Date.now()).slice(-5)}${String((phoneCounter += 1)).padStart(3, '0')}`;

async function latestSession(phone) {
  return env.prisma.chatSession.findFirst({ where: { user: { phone } }, orderBy: { startedAt: 'desc' } });
}

async function messagesOf(phone) {
  return env.prisma.message.findMany({ where: { user: { phone } }, orderBy: { createdAt: 'asc' } });
}

before(async () => {
  openai = await startFakeOpenAI();
  evolution = await startFakeEvolution();
  env = await startTestApp({ name: 'encaminhamento', openaiUrl: openai.url, evolutionUrl: evolution.url });
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

describe('ferramenta encaminhar_para_equipe', () => {
  it('está definida para a IA e o prompt explica quando usá-la', () => {
    const { toolDefinitions } = require('../src/tools');
    const { SYSTEM_PROMPT } = require('../src/prompts/systemPrompt');
    const tool = toolDefinitions.find((t) => t.function.name === 'encaminhar_para_equipe');
    assert.ok(tool, 'ferramenta não encontrada');
    assert.deepEqual(tool.function.parameters.required, ['motivo']);
    assert.deepEqual(tool.function.parameters.properties.prioridade.enum, ['alta', 'normal']);
    assert.match(SYSTEM_PROMPT, /encaminhar_para_equipe/);
    assert.match(SYSTEM_PROMPT, /Não prometa prazo/);
    assert.match(SYSTEM_PROMPT, /pronto-socorro/);
  });

  it('marca a sessão (REQUESTED, motivo, prioridade alta) e a IA continua a resposta', async () => {
    const phone = newPhone();
    const finalText = 'Poxa, sinto muito pela dor! Já sinalizei a nossa equipe, e alguém vai continuar seu atendimento por aqui.';
    openai.enqueue(
      { toolCalls: [{ name: 'encaminhar_para_equipe', arguments: { motivo: 'Dor forte e rosto inchado', prioridade: 'alta' } }] },
      { content: finalText },
    );

    const { body } = await postWebhook(env.url, textPayload({ phone, text: 'Estou com muita dor e o rosto inchado' }));
    assert.equal(body.reply, finalText);
    assert.equal(evolution.sent.length, 1);
    assert.equal(evolution.sent[0].number, phone);
    assert.equal(evolution.sent[0].text, finalText);

    // A segunda chamada à OpenAI recebeu o resultado da ferramenta.
    const toolMsg = openai.requests[1].messages.find((m) => m.role === 'tool');
    assert.equal(JSON.parse(toolMsg.content).sucesso, true);

    const session = await latestSession(phone);
    assert.equal(session.handoffStatus, 'REQUESTED');
    assert.equal(session.priority, 'HIGH');
    assert.equal(session.handoffReason, 'Dor forte e rosto inchado');
    assert.ok(session.handoffRequestedAt instanceof Date);
    assert.ok(Date.now() - session.handoffRequestedAt.getTime() < 60_000);

    // Idempotente: um segundo encaminhamento (normal) não rebaixa a prioridade nem reinicia o pedido.
    openai.reset();
    openai.enqueue(
      { toolCalls: [{ name: 'encaminhar_para_equipe', arguments: { motivo: 'Pergunta sobre convênio', prioridade: 'normal' } }] },
      { content: 'Certo! A equipe já está sinalizada e vai te responder por aqui.' },
    );
    await postWebhook(env.url, textPayload({ phone, text: 'Vocês aceitam convênio?' }));
    const again = await latestSession(phone);
    assert.equal(again.handoffStatus, 'REQUESTED');
    assert.equal(again.priority, 'HIGH');
    assert.equal(again.handoffReason, 'Dor forte e rosto inchado');
    assert.equal(again.handoffRequestedAt.getTime(), session.handoffRequestedAt.getTime());
    // Com a equipe já sinalizada, a IA recebe esse aviso no contexto.
    const systemTexts = openai.requests[0].messages.filter((m) => m.role === 'system').map((m) => m.content);
    assert.ok(systemTexts.some((t) => /já foi sinalizada/.test(t)));
  });

  it('prioridade normal por padrão e não tira a conversa de HUMAN_ACTIVE', async () => {
    const { encaminharParaEquipe } = require('../src/services/handoffService');
    const phone = newPhone();
    const user = await env.db.upsertUser({ remoteJid: `${phone}@s.whatsapp.net`, phone });
    const session = await env.db.getOrCreateActiveSession(user.id);

    const r1 = await encaminharParaEquipe({ motivo: 'Quer falar com uma pessoa' }, { sessionId: session.id });
    assert.equal(r1.sucesso, true);
    assert.equal(r1.prioridade, 'normal');
    let s = await latestSession(phone);
    assert.equal(s.handoffStatus, 'REQUESTED');
    assert.equal(s.priority, 'NORMAL');

    await env.prisma.chatSession.update({
      where: { id: session.id },
      data: { handoffStatus: 'HUMAN_ACTIVE', humanActiveUntil: new Date(Date.now() + HOUR) },
    });
    const r2 = await encaminharParaEquipe({ motivo: 'Reclamação', prioridade: 'alta' }, { sessionId: session.id });
    assert.equal(r2.sucesso, true);
    assert.equal(r2.situacao, 'equipe_ja_esta_atendendo');
    s = await latestSession(phone);
    assert.equal(s.handoffStatus, 'HUMAN_ACTIVE');
    assert.equal(s.priority, 'HIGH');

    const semMotivo = await encaminharParaEquipe({ motivo: '  ' }, { sessionId: session.id });
    assert.equal(semMotivo.sucesso, false);
  });

  it('agendamento de emergência também marca a sessão com prioridade alta', async () => {
    const phone = newPhone();
    const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
      new Date(Date.now() + 24 * HOUR),
    );
    openai.enqueue(
      {
        toolCalls: [
          {
            name: 'agendar_consulta',
            arguments: { nome_paciente: 'Ana', data_horario: `${tomorrow} 09:00`, motivo: 'Dente quebrado', emergencia: true },
          },
        ],
      },
      { content: 'Prontinho, Ana! Sua consulta de urgência está marcada para amanhã às 9h.' },
    );
    await postWebhook(env.url, textPayload({ phone, text: 'Quebrei o dente, pode ser amanhã cedo?' }));

    const toolMsg = openai.requests[1].messages.find((m) => m.role === 'tool');
    assert.equal(JSON.parse(toolMsg.content).sucesso, true, toolMsg.content);
    const session = await latestSession(phone);
    assert.equal(session.priority, 'HIGH');
    assert.equal(session.handoffStatus, 'NONE');
  });
});

describe('equipe assumindo a conversa pelo WhatsApp da clínica (fromMe)', () => {
  it('mensagem da equipe pausa o agente, é salva como STAFF e o agente volta após o prazo', async () => {
    const phone = newPhone();
    await postWebhook(env.url, textPayload({ phone, text: 'Oi, quero saber sobre clareamento' }));
    assert.equal(evolution.sent.length, 1);

    // A equipe responde pelo celular da clínica.
    const staffText = 'Oi Ana, aqui é a Carla da recepção. Vou te ajudar!';
    const staff = await postWebhook(env.url, textPayload({ phone, text: staffText, fromMe: true, id: nextId('EQUIPE') }));
    assert.equal(staff.body.result, 'equipe');

    let session = await latestSession(phone);
    assert.equal(session.handoffStatus, 'HUMAN_ACTIVE');
    const remaining = session.humanActiveUntil.getTime() - Date.now();
    assert.ok(remaining > 11.9 * HOUR && remaining <= 12 * HOUR, `pausa inesperada: ${remaining} ms`);

    let msgs = await messagesOf(phone);
    const staffMsg = msgs.find((m) => m.role === 'STAFF');
    assert.equal(staffMsg.content, staffText);

    // Paciente escreve durante o atendimento humano: salva, mas NÃO chama a IA nem envia nada.
    const openaiCalls = openai.requests.length;
    const sentBefore = evolution.sent.length;
    const during = await postWebhook(env.url, textPayload({ phone, text: 'Obrigada, Carla! Quanto custa?' }));
    assert.equal(during.body.reply, null);
    assert.equal(openai.requests.length, openaiCalls);
    assert.equal(evolution.sent.length, sentBefore);
    msgs = await messagesOf(phone);
    assert.equal(msgs.at(-1).role, 'USER');
    assert.equal(msgs.at(-1).content, 'Obrigada, Carla! Quanto custa?');

    // Mídia da equipe vira marcador (sem transcrição).
    const audio = await postWebhook(env.url, audioPayload({ phone }));
    assert.equal(audio.body.result, 'equipe');
    msgs = await messagesOf(phone);
    assert.equal(msgs.at(-1).role, 'STAFF');
    assert.equal(msgs.at(-1).content, '[áudio enviado pela equipe]');
    assert.ok(!openai.requests.some((r) => r.file), 'não deveria transcrever áudio da equipe');

    // Prazo vencido: o agente volta a responder e o status volta a NONE.
    await env.prisma.chatSession.update({
      where: { id: session.id },
      data: { humanActiveUntil: new Date(Date.now() - 1000) },
    });
    const back = await postWebhook(env.url, textPayload({ phone, text: 'Oi, ainda estão aí?' }));
    assert.equal(back.body.reply, openai.DEFAULT_REPLY);
    assert.equal(evolution.sent.at(-1).text, openai.DEFAULT_REPLY);
    session = await latestSession(phone);
    assert.equal(session.handoffStatus, 'NONE');
    assert.equal(session.humanActiveUntil, null);

    // No histórico enviado à IA, a equipe aparece como "assistant" com o prefixo [Equipe].
    const history = openai.requests.at(-1).messages;
    assert.ok(history.some((m) => m.role === 'assistant' && m.content === `[Equipe] ${staffText}`));
    assert.ok(history.some((m) => m.role === 'assistant' && m.content === '[Equipe] [áudio enviado pela equipe]'));
  });

  it('eco do próprio agente (ID conhecido) não pausa o agente', async () => {
    const phone = newPhone();
    const { body } = await postWebhook(env.url, textPayload({ phone, text: 'Bom dia!' }));
    const sent = evolution.sent.at(-1);

    const echo = await postWebhook(env.url, textPayload({ phone, text: body.reply, fromMe: true, id: sent.id }));
    assert.equal(echo.body.result, 'sistema');

    // ID registrado por outra parte do sistema (ex.: API administrativa) também é reconhecido.
    const { registerSentMessageId } = require('../src/services/sentMessageRegistry');
    const painelId = nextId('PAINEL');
    registerSentMessageId(painelId);
    const painel = await postWebhook(env.url, textPayload({ phone, text: 'Texto enviado pelo painel', fromMe: true, id: painelId }));
    assert.equal(painel.body.result, 'sistema');

    // Reforço por texto: mesmo texto enviado ao mesmo número há pouco, ainda que com outro ID.
    const sameText = await postWebhook(env.url, textPayload({ phone, text: body.reply, fromMe: true, id: nextId('OUTRO') }));
    assert.equal(sameText.body.result, 'sistema');

    const session = await latestSession(phone);
    assert.equal(session.handoffStatus, 'NONE');
    const msgs = await messagesOf(phone);
    assert.equal(msgs.filter((m) => m.role === 'STAFF').length, 0);

    const next = await postWebhook(env.url, textPayload({ phone, text: 'Quero marcar uma avaliação' }));
    assert.equal(next.body.reply, openai.DEFAULT_REPLY);
  });

  it('eco que chega ANTES de o sendText retornar não é confundido com a equipe', async () => {
    const phone = newPhone();
    let echoResult;
    // A Evolution entrega o eco pelo webhook e só depois responde ao sendText.
    evolution.setOnSend(async (entry) => {
      echoResult = postWebhook(env.url, textPayload({ phone, text: entry.text, fromMe: true, id: entry.id }));
      await sleep(400); // mais que FROM_ME_PROCESS_DELAY_MS (150 ms nos testes)
    });

    const { body } = await postWebhook(env.url, textPayload({ phone, text: 'Oi, tudo bem?' }));
    assert.equal(body.reply, openai.DEFAULT_REPLY);
    const echo = await echoResult;
    assert.equal(echo.body.result, 'sistema');

    const session = await latestSession(phone);
    assert.equal(session.handoffStatus, 'NONE');
    const msgs = await messagesOf(phone);
    assert.deepEqual(
      msgs.map((m) => m.role),
      ['USER', 'ASSISTANT'],
    );
    assert.equal(msgs[1].externalId, evolution.sent[0].id);

    evolution.setOnSend(null);
    const next = await postWebhook(env.url, textPayload({ phone, text: 'Quais horários amanhã?' }));
    assert.equal(next.body.reply, openai.DEFAULT_REPLY);
  });

  it('eco antecipado de uma mensagem que não vai para o banco (fallback) também é reconhecido', async () => {
    const phone = newPhone();
    let echoResult;
    evolution.setOnSend(async (entry) => {
      echoResult = postWebhook(env.url, textPayload({ phone, text: entry.text, fromMe: true, id: entry.id }));
      await sleep(400);
    });
    openai.enqueue({ status: 400 }); // OpenAI falha -> o agente envia a mensagem de fallback

    const { body } = await postWebhook(env.url, textPayload({ phone, text: 'Oi' }));
    assert.match(body.reply, /instabilidade/);
    const echo = await echoResult;
    assert.equal(echo.body.result, 'sistema');
    evolution.setOnSend(null);

    const session = await latestSession(phone);
    assert.equal(session.handoffStatus, 'NONE');
    const msgs = await messagesOf(phone);
    assert.equal(msgs.filter((m) => m.role === 'STAFF').length, 0);
  });

  it('eventos fromMe duplicados são ignorados', async () => {
    const phone = newPhone();
    const payload = textPayload({ phone, text: 'Oi, aqui é o Dr. Paulo.', fromMe: true, id: nextId('EQUIPE') });
    const first = await postWebhook(env.url, payload);
    const second = await postWebhook(env.url, payload);
    assert.equal(first.body.result, 'equipe');
    assert.equal(second.body.result, 'duplicada');
    const msgs = await messagesOf(phone);
    assert.equal(msgs.filter((m) => m.role === 'STAFF').length, 1);
    assert.equal(evolution.sent.length, 0);
  });

  it('atendimento novo (depois do SESSION_TIMEOUT_HOURS) começa com o agente', async () => {
    const phone = newPhone();
    await postWebhook(env.url, textPayload({ phone, text: 'Oi' }));
    await postWebhook(env.url, textPayload({ phone, text: 'Oi, sou da equipe', fromMe: true, id: nextId('EQUIPE') }));
    const old = await latestSession(phone);
    assert.equal(old.handoffStatus, 'HUMAN_ACTIVE');

    // Simula 13 h sem mensagens (a pausa ainda "valeria", mas o atendimento expirou).
    await env.prisma.chatSession.update({
      where: { id: old.id },
      data: { lastMessageAt: new Date(Date.now() - 13 * HOUR) },
    });

    const { body } = await postWebhook(env.url, textPayload({ phone, text: 'Bom dia, voltei!' }));
    assert.equal(body.reply, openai.DEFAULT_REPLY);
    const current = await latestSession(phone);
    assert.notEqual(current.id, old.id);
    assert.equal(current.handoffStatus, 'NONE');
    assert.equal(current.priority, 'NORMAL');
  });
});
