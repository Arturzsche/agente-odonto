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

/**
 * Sessão ativa e ainda dentro do prazo (SESSION_TIMEOUT_HOURS) do paciente, sem criar nem
 * encerrar nada. Retorna null se não houver (a próxima mensagem abriria um novo atendimento).
 */
async function findOpenSession(remoteJid, now = new Date()) {
  const timeoutMs = config.db.sessionTimeoutHours * 60 * 60 * 1000;
  const session = await prisma.chatSession.findFirst({
    where: { status: 'ACTIVE', user: { remoteJid } },
    orderBy: { lastMessageAt: 'desc' },
  });
  if (!session || now.getTime() - session.lastMessageAt.getTime() > timeoutMs) return null;
  return session;
}

module.exports = { getOrCreateActiveSession, findOpenSession };
