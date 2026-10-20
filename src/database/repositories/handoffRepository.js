const prisma = require('../prisma');
const config = require('../../config');

/**
 * Encaminhamento para a equipe humana (ChatSession.handoffStatus):
 *   NONE         -> o agente conduz a conversa.
 *   REQUESTED    -> a IA sinalizou a equipe (encaminhar_para_equipe); o agente continua respondendo.
 *   HUMAN_ACTIVE -> a equipe assumiu; o agente fica pausado até humanActiveUntil.
 */

/** True se a equipe assumiu a conversa e o prazo de pausa do agente ainda não venceu. */
function isHumanActive(session, now = new Date()) {
  return (
    session?.handoffStatus === 'HUMAN_ACTIVE' &&
    session.humanActiveUntil instanceof Date &&
    session.humanActiveUntil.getTime() > now.getTime()
  );
}

/** Fim da pausa do agente contado a partir de agora (HUMAN_TAKEOVER_HOURS). */
function humanActiveUntilFrom(now = new Date()) {
  return new Date(now.getTime() + config.handoff.humanTakeoverHours * 60 * 60 * 1000);
}

/**
 * Pedido de encaminhamento feito pela IA. Idempotente (pode ser chamado várias vezes):
 * - o status vira REQUESTED, a não ser que a equipe já esteja ativa (HUMAN_ACTIVE no prazo);
 * - handoffRequestedAt marca o início do encaminhamento e é mantido se ele já estava aberto;
 * - a prioridade só sobe (NORMAL -> HIGH), nunca desce, e o motivo de uma urgência ainda aberta
 *   não é trocado pelo de um pedido normal.
 * @param {string} sessionId
 * @param {{ reason: string, highPriority?: boolean }} data
 * @returns {Promise<object|null>} a sessão atualizada, ou null se ela não existir
 */
async function requestHandoff(sessionId, { reason, highPriority = false }, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    // Trava a linha da sessão: a IA pode chamar esta ferramenta em paralelo com outras.
    const locked = await tx.$queryRaw`SELECT id FROM chat_sessions WHERE id = ${sessionId}::uuid FOR UPDATE`;
    if (locked.length === 0) return null;

    const session = await tx.chatSession.findUnique({ where: { id: sessionId } });
    const humanActive = isHumanActive(session, now);
    const alreadyOpen = session.handoffStatus === 'REQUESTED' || humanActive;
    const keepUrgentReason =
      !highPriority && alreadyOpen && session.priority === 'HIGH' && Boolean(session.handoffReason);

    return tx.chatSession.update({
      where: { id: sessionId },
      data: {
        ...(!humanActive && { handoffStatus: 'REQUESTED' }),
        ...(highPriority && { priority: 'HIGH' }),
        ...(!keepUrgentReason && { handoffReason: reason }),
        ...(!(alreadyOpen && session.handoffRequestedAt) && { handoffRequestedAt: now }),
      },
    });
  });
}

/**
 * Grava uma mensagem da equipe (role STAFF) e marca a conversa como HUMAN_ACTIVE, renovando a
 * pausa do agente por HUMAN_TAKEOVER_HOURS, tudo na mesma transação.
 * Usada quando a equipe responde pelo WhatsApp da clínica; serve também para a API administrativa.
 * @param {{ sessionId: string, userId: string, content: string, externalId?: string|null,
 *           sentAt?: Date, reopen?: boolean }} data  sentAt: quando a equipe enviou (padrão: agora).
 *           A pausa conta a partir daí, para que uma mensagem antiga entregue com atraso não pause o
 *           agente à toa. reopen: reabre a sessão encerrada (usado pelo painel ao escrever no
 *           atendimento mais recente do paciente).
 */
async function saveStaffMessage({ sessionId, userId, content, externalId = null, sentAt, reopen = false }, now = new Date()) {
  const from = sentAt instanceof Date && sentAt.getTime() < now.getTime() ? sentAt : now;
  const until = humanActiveUntilFrom(from);

  return prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: { sessionId, userId, role: 'STAFF', type: 'TEXT', content, externalId },
    });
    // Nunca encurta uma pausa maior que já esteja valendo.
    const current = await tx.chatSession.findUnique({
      where: { id: sessionId },
      select: { handoffStatus: true, humanActiveUntil: true },
    });
    const keepCurrent = isHumanActive(current, until);
    const session = await tx.chatSession.update({
      where: { id: sessionId },
      data: {
        lastMessageAt: now,
        ...(reopen && { status: 'ACTIVE', endedAt: null }),
        handoffStatus: 'HUMAN_ACTIVE',
        humanActiveUntil: keepCurrent ? current.humanActiveUntil : until,
      },
    });
    return { message, session };
  });
}

/** Prazo da pausa vencido: devolve a conversa ao agente (HUMAN_ACTIVE -> NONE). */
async function releaseExpiredHumanHandoff(sessionId, now = new Date()) {
  const { count } = await prisma.chatSession.updateMany({
    where: {
      id: sessionId,
      handoffStatus: 'HUMAN_ACTIVE',
      OR: [{ humanActiveUntil: null }, { humanActiveUntil: { lte: now } }],
    },
    data: { handoffStatus: 'NONE', humanActiveUntil: null },
  });
  return count > 0;
}

/** Consulta rápida antes de enviar uma resposta: a equipe assumiu enquanto a IA pensava? */
async function isSessionHumanActive(sessionId, now = new Date()) {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { handoffStatus: true, humanActiveUntil: true },
  });
  return isHumanActive(session, now);
}

/** Prioridade alta para a sessão (ex.: agendamento de emergência). Não mexe no encaminhamento. */
async function markSessionHighPriority(sessionId) {
  const { count } = await prisma.chatSession.updateMany({ where: { id: sessionId }, data: { priority: 'HIGH' } });
  return count > 0;
}

module.exports = {
  isHumanActive,
  humanActiveUntilFrom,
  requestHandoff,
  saveStaffMessage,
  releaseExpiredHumanHandoff,
  isSessionHumanActive,
  markSessionHighPriority,
};
