const { OpenAI, toFile } = require('openai');
const config = require('../config');
const logger = require('../utils/logger');
const { toolDefinitions, executeTool } = require('../tools');
const { todayInClinicTz } = require('./calendarService');
const { SYSTEM_PROMPT, buildContextPrompt } = require('../prompts/systemPrompt');

let client;
/** Cria o cliente só no primeiro uso: sem chave, o servidor sobe e o erro cai no try/catch. */
function getClient() {
  if (!client) {
    client = new OpenAI({ apiKey: config.openai.apiKey, timeout: 60_000, maxRetries: 2 });
  }
  return client;
}

// Limite de idas e voltas com a OpenAI numa mesma resposta (tools + correções).
const MAX_ROUNDS = 6;

// Frases de "espera" que a IA às vezes envia SEM chamar a ferramenta. Se fossem entregues ao
// paciente, a conversa travaria: ele espera o retorno e o bot espera uma nova mensagem.
const STALL_PATTERN =
  /\b(um momento|um minutinho|só um (instante|minuto|momentinho)|aguarde|vou (verificar|checar|consultar|conferir|ver)|deixa eu (ver|verificar|checar|consultar)|já (te )?(retorno|volto|respondo)|estou (verificando|consultando|checando))\b/i;

// Encaminhar algo para a equipe humana é uma resposta legítima, não uma espera.
const HANDOFF_PATTERN = /\b(equipe|dentista|doutor|doutora|recepção)\b/i;
const isStall = (text) => STALL_PATTERN.test(text) && !HANDOFF_PATTERN.test(text);

// Ferramentas só de consulta: seguras para forçar quando a IA "prometeu" verificar algo.
const LOOKUP_TOOLS = toolDefinitions.filter((t) =>
  ['consultar_disponibilidade_agenda', 'consultar_valor_avaliacao'].includes(t.function.name),
);

const STALL_CORRECTION =
  'Sua última resposta prometia verificar algo, mas nenhuma ferramenta foi chamada e o paciente ' +
  'ficaria esperando sem retorno. Não envie mensagens de espera: chame agora a ferramenta ' +
  'necessária e depois responda com a informação completa.';

function buildMessages(history) {
  const weekday = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    timeZone: config.calendar.timezone,
  }).format(new Date());

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'system',
      content: buildContextPrompt({
        today: todayInClinicTz(),
        weekday,
        timezone: config.calendar.timezone,
        openHour: config.calendar.openHour,
        closeHour: config.calendar.closeHour,
      }),
    },
    ...history,
  ];
}

/**
 * Gera a resposta da IA executando o ciclo completo de Function Calling.
 * Todas as ferramentas são aguardadas aqui dentro; o retorno é SEMPRE o texto final, pronto
 * para enviar ao paciente numa única mensagem.
 * @param {Array<{role: string, content: string}>} history histórico (já inclui a mensagem nova do usuário)
 * @param {{ remoteJid: string, phone: string, userId?: string, sessionId?: string }} ctx
 * @returns {Promise<string>}
 */
async function generateReply(history, ctx) {
  const messages = buildMessages(history);
  let stallCorrections = 0;
  let toolsCalled = false;

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    // Na correção de uma resposta de espera, obriga a IA a usar uma ferramenta de consulta.
    const forcingLookup = stallCorrections > 0 && !toolsCalled;
    const completion = await getClient().chat.completions.create({
      model: config.openai.chatModel,
      messages,
      tools: forcingLookup ? LOOKUP_TOOLS : toolDefinitions,
      tool_choice: forcingLookup ? 'required' : 'auto',
      temperature: 0.6,
    });

    const reply = completion.choices[0].message;

    if (reply.tool_calls?.length) {
      // Texto que venha junto com tool_calls ("um momento...") é descartado de propósito:
      // o paciente recebe apenas a resposta final.
      messages.push({ role: 'assistant', content: reply.content || null, tool_calls: reply.tool_calls });

      // Executa as ferramentas em paralelo e aguarda todas antes de voltar à IA.
      const results = await Promise.all(
        reply.tool_calls.map(async (call) => {
          const { name, arguments: args } = call.function;
          logger.info(`[openai] Tool chamada: ${name} ${args}`);
          const result = await executeTool(name, args, ctx);
          logger.info(`[openai] Resultado de ${name}: ${result}`);
          return { role: 'tool', tool_call_id: call.id, content: result };
        }),
      );
      messages.push(...results);
      toolsCalled = true;
      continue;
    }

    const text = (reply.content || '').trim();

    // Resposta de espera sem ferramenta: corrige uma vez em vez de deixar a conversa travada.
    if (isStall(text) && stallCorrections === 0) {
      logger.warn(`[openai] Resposta de espera sem ferramenta, corrigindo: "${text}"`);
      stallCorrections += 1;
      messages.push({ role: 'assistant', content: text });
      messages.push({ role: 'system', content: STALL_CORRECTION });
      continue;
    }

    return text;
  }

  throw new Error(`Limite de ${MAX_ROUNDS} rodadas com a OpenAI atingido sem resposta final.`);
}

/**
 * Transcreve um áudio (Buffer) com o Whisper.
 * @param {Buffer} audioBuffer
 * @param {string} [mimetype]
 */
async function transcribeAudio(audioBuffer, mimetype = 'audio/ogg') {
  const ext = (mimetype.split('/')[1] || 'ogg').split(';')[0].trim();
  const file = await toFile(audioBuffer, `audio.${ext === 'mpeg' ? 'mp3' : ext}`, { type: mimetype });

  const transcription = await getClient().audio.transcriptions.create({
    file,
    model: config.openai.transcriptionModel,
    language: 'pt',
  });
  return (transcription.text || '').trim();
}

module.exports = { generateReply, transcribeAudio, SYSTEM_PROMPT, isStall };
