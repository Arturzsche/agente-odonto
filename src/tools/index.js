const appointmentService = require('../services/appointmentService');
const handoffService = require('../services/handoffService');

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
          emergencia: {
            type: 'boolean',
            description: 'true se o paciente relatou dor aguda, inchaço, sangramento ou dente quebrado.',
          },
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
  {
    type: 'function',
    function: {
      name: 'encaminhar_para_equipe',
      description:
        'Sinaliza a equipe humana da clínica para continuar o atendimento desta conversa. Use em ' +
        'relatos de urgência (dor forte, inchaço, sangramento, dente quebrado, trauma, febre), dúvidas ' +
        'que não estão nas informações disponíveis, pedido para falar com uma pessoa ou reclamações. ' +
        'Depois, avise o paciente com naturalidade, sem prometer prazo.',
      parameters: {
        type: 'object',
        properties: {
          motivo: {
            type: 'string',
            description:
              'Resumo curto e objetivo do motivo (ex.: "Dor forte e rosto inchado desde ontem", "Pergunta se aceita convênio Amil").',
          },
          prioridade: {
            type: 'string',
            enum: ['alta', 'normal'],
            description:
              '"alta" para urgências (dor forte, inchaço, sangramento, dente quebrado, trauma, febre); "normal" nos demais casos.',
          },
        },
        required: ['motivo'],
        additionalProperties: false,
      },
    },
  },
];

/** Implementações locais de cada tool. `ctx` traz dados da conversa (ex.: remoteJid). */
const handlers = {
  consultar_disponibilidade_agenda: ({ data_desejada }) =>
    appointmentService.consultarDisponibilidade(data_desejada),

  agendar_consulta: (args, ctx) => appointmentService.agendarConsulta(args, ctx),

  consultar_valor_avaliacao: () => '150.00',

  encaminhar_para_equipe: (args, ctx) => handoffService.encaminharParaEquipe(args, ctx),
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
