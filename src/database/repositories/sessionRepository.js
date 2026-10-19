const prisma = require('../prisma');
const config = require('../../config');

/**
 * Retorna a sessão ativa do paciente ou abre uma nova.
 * Se a última mensagem da sessão ativa for mais antiga que SESSION_TIMEOUT_HOURS, ela é
 * encerrada e uma nova é criada (novo atendimento = contexto limpo para a IA).
 */
async function getOrCreateActiveSession(userId, now = new Date()) {
  const timeoutMs = config.db.sessionTimeoutHours * 60 * 60 * 1000;

  return prisma.$transaction(async (tx) => {
    const active = await tx.chatSession.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (active && now.getTime() - active.lastMessageAt.getTime() <= timeoutMs) {
      return active;
    }

    // Encerra qualquer sessão ativa expirada (normalmente só existe uma).
    await tx.chatSession.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CLOSED', endedAt: now },
    });

    return tx.chatSession.create({ data: { userId, startedAt: now, lastMessageAt: now } });
  });
}

module.exports = { getOrCreateActiveSession };
