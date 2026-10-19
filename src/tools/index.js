const calendarService = require('../services/calendarService');

/** Definições enviadas à OpenAI no parâmetro `tools`. */
const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'consultar_disponibilidade_agenda',
      description:
        'Consulta os horários livres na agenda da clínica para uma data. Use antes de oferecer horários ao paciente.',
      parameters: {
        type: 'object',
        properties: {
          data_desejada: {
            type: 'string',
            description: 'Data desejada no formato YYYY-MM-DD.',
          },
        },
        required: ['data_desejada'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'agendar_consulta',
      description:
        'Agenda a consulta de avaliação. Só chame depois que o paciente confirmar o nome e um horário retornado pela consulta de disponibilidade.',
      parameters: {
        type: 'object',
        properties: {
          nome_paciente: { type: 'string', description: 'Nome completo do paciente.' },
          data_horario: { type: 'string', description: 'Data e hora no formato "YYYY-MM-DD HH:mm".' },
          motivo: { type: 'string', description: 'Motivo da consulta (ex.: dor de dente, limpeza, EMERGÊNCIA - dente quebrado).' },
        },
        required: ['nome_paciente', 'data_horario', 'motivo'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_valor_avaliacao',
      description: 'Retorna o valor da avaliação inicial da clínica.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
];

/** Implementações locais de cada tool. `ctx` traz dados da conversa (ex.: remoteJid). */
const handlers = {
  consultar_disponibilidade_agenda: ({ data_desejada }) =>
    calendarService.consultarDisponibilidade(data_desejada),

  agendar_consulta: (args, ctx) =>
    calendarService.agendarConsulta({ ...args, telefone: ctx.phone }),

  consultar_valor_avaliacao: () => '150.00',
};

/** Executa uma tool com segurança: qualquer erro vira um JSON que a IA consegue interpretar. */
async function executeTool(name, rawArgs, ctx = {}) {
  const handler = handlers[name];
  if (!handler) return JSON.stringify({ erro: `Função desconhecida: ${name}` });

  try {
    const args = rawArgs ? JSON.parse(rawArgs) : {};
    const result = await handler(args, ctx);
    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch (err) {
    return JSON.stringify({ erro: `Falha ao executar ${name}: ${err.message}` });
  }
}

module.exports = { toolDefinitions, executeTool };
