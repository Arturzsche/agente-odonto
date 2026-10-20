const db = require('../database');
const logger = require('../utils/logger');

/** O motivo aparece no painel da equipe: um resumo curto basta. */
const MAX_REASON_LENGTH = 300;

/**
 * Ferramenta encaminhar_para_equipe: sinaliza a equipe humana para continuar o atendimento.
 * Só marca a sessão (REQUESTED + motivo + prioridade); o agente continua respondendo até que
 * alguém da equipe assuma a conversa. Idempotente.
 * @param {{ motivo?: string, prioridade?: 'alta'|'normal' }} args
 * @param {{ sessionId?: string }} ctx
 */
async function encaminharParaEquipe({ motivo, prioridade } = {}, ctx = {}) {
  const reason = typeof motivo === 'string' ? motivo.replace(/\s+/g, ' ').trim().slice(0, MAX_REASON_LENGTH) : '';
  if (!reason) {
    return { sucesso: false, erro: 'Informe o motivo do encaminhamento em "motivo".' };
  }
  if (!ctx?.sessionId) {
    return { sucesso: false, erro: 'Conversa não identificada.' };
  }
  const highPriority = String(prioridade || '').trim().toLowerCase() === 'alta';

  const session = await db.requestHandoff(ctx.sessionId, { reason, highPriority });
  if (!session) {
    return { sucesso: false, erro: 'Conversa não encontrada.' };
  }

  const prioridadeFinal = session.priority === 'HIGH' ? 'alta' : 'normal';
  logger.info(`[handoff] Equipe sinalizada na sessão ${session.id} (prioridade ${prioridadeFinal}): ${reason}`);

  return {
    sucesso: true,
    situacao: session.handoffStatus === 'HUMAN_ACTIVE' ? 'equipe_ja_esta_atendendo' : 'equipe_sinalizada',
    prioridade: prioridadeFinal,
    mensagem:
      'A equipe da clínica foi sinalizada e vai continuar o atendimento por aqui. Avise o paciente ' +
      'com naturalidade, sem prometer prazo, e siga ajudando no que for possível.',
  };
}

module.exports = { encaminharParaEquipe };
