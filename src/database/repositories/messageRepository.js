const prisma = require('../prisma');
const config = require('../../config');

const ROLE_TO_OPENAI = { USER: 'user', ASSISTANT: 'assistant' };

/**
 * Salva a mensagem e atualiza o "último contato" da sessão na mesma transação.
 * @param {{ sessionId: string, userId: string, role: 'USER'|'ASSISTANT', content: string,
 *           type?: 'TEXT'|'AUDIO', externalId?: string|null }} data
 */
async function saveMessage({ sessionId, userId, role, content, type = 'TEXT', externalId = null }) {
  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { sessionId, userId, role, type, content, externalId } }),
    prisma.chatSession.update({ where: { id: sessionId }, data: { lastMessageAt: new Date() } }),
  ]);
  return message;
}

/** Últimas N mensagens da sessão, em ordem cronológica, já no formato da OpenAI. */
async function getHistory(sessionId, limit = config.db.historyLimit) {
  const rows = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { role: true, content: true },
  });
  return rows.reverse().map(({ role, content }) => ({ role: ROLE_TO_OPENAI[role], content }));
}

module.exports = { saveMessage, getHistory };
