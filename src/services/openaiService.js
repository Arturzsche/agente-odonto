const { OpenAI, toFile } = require('openai');
const config = require('../config');
const logger = require('../utils/logger');
const { toolDefinitions, executeTool } = require('../tools');
const { todayInClinicTz } = require('./calendarService');

let client;
/** Cria o cliente só no primeiro uso: sem chave, o servidor sobe e o erro cai no try/catch. */
function getClient() {
  if (!client) {
    client = new OpenAI({ apiKey: config.openai.apiKey, timeout: 60_000, maxRetries: 2 });
  }
  return client;
}

const MAX_TOOL_ROUNDS = 5;

const SYSTEM_PROMPT = `Você é a assistente virtual da Clínica Odontológica Sorriso Ideal. Seu objetivo é realizar a triagem de pacientes de forma ágil, empática e acolhedora, culminando no agendamento de uma avaliação. Regras:

1. Responda em no máximo 2 a 3 frases curtas, ideal para WhatsApp.
2. Nunca dê diagnósticos médicos nem prometa valores exatos para procedimentos complexos.
3. O valor da avaliação inicial é R$ 150,00.
4. Se o paciente relatar dor aguda, inchaço, sangramento ou dente quebrado, classifique como EMERGÊNCIA, ofereça o horário mais próximo e aja com extrema empatia.
5. Seja natural, use emojis com moderação.`;

/** Contexto dinâmico: sem a data atual a IA não sabe converter "amanhã" em YYYY-MM-DD. */
function buildContextPrompt() {
  const hoje = todayInClinicTz();
  const diaSemana = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    timeZone: config.calendar.timezone,
  }).format(new Date());
  return (
    `Data de hoje: ${hoje} (${diaSemana}), fuso ${config.calendar.timezone}. ` +
    'Sempre consulte a disponibilidade antes de oferecer horários e só agende após o paciente confirmar nome e horário.'
  );
}

/**
 * Gera a resposta da IA executando o loop de Function Calling.
 * @param {Array<{role: string, content: string}>} history histórico (já inclui a mensagem nova do usuário)
 * @param {{ remoteJid: string, phone: string }} ctx
 * @returns {Promise<string>} texto final para enviar ao paciente
 */
async function generateReply(history, ctx) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: buildContextPrompt() },
    ...history,
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const completion = await getClient().chat.completions.create({
      model: config.openai.chatModel,
      messages,
      tools: toolDefinitions,
      tool_choice: 'auto',
      temperature: 0.5,
    });

    const reply = completion.choices[0].message;

    if (!reply.tool_calls?.length) {
      return (reply.content || '').trim();
    }

    // A mensagem do assistente com os tool_calls precisa entrar no histórico antes dos resultados.
    messages.push(reply);

    for (const call of reply.tool_calls) {
      const { name, arguments: args } = call.function;
      logger.info(`[openai] Tool chamada: ${name} ${args}`);
      const result = await executeTool(name, args, ctx);
      logger.info(`[openai] Resultado de ${name}: ${result}`);
      messages.push({ role: 'tool', tool_call_id: call.id, content: result });
    }
  }

  throw new Error(`Limite de ${MAX_TOOL_ROUNDS} rodadas de function calling atingido.`);
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

module.exports = { generateReply, transcribeAudio, SYSTEM_PROMPT };
