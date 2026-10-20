const prisma = require('../prisma');
const config = require('../../config');

const ROLE_TO_OPENAI = { USER: 'user', ASSISTANT: 'assistant' };

/** Mensagens da equipe entram no histórico da IA como "assistant" com este prefixo. */
const STAFF_PREFIX = '[Equipe] ';

/**
 * Salva a mensagem e atualiza o "último contato" da sessão na mesma transação.
 * (Mensagens da equipe usam handoffRepository.saveStaffMessage, que também pausa o agente.)
 * @param {{ sessionId: string, userId: string, role: 'USER'|'ASSISTANT'|'STAFF', content: string,
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
  return rows.reverse().map(({ role, content }) =>
    role === 'STAFF'
      ? { role: 'assistant', content: `${STAFF_PREFIX}${content}` }
      : { role: ROLE_TO_OPENAI[role], content },
  );
}

/** True se já existe mensagem gravada com este ID do WhatsApp (key.id). */
async function messageExistsByExternalId(externalId) {
  if (!externalId) return false;
  const found = await prisma.message.findUnique({ where: { externalId }, select: { id: true } });
  return Boolean(found);
}

/** True se o agente enviou exatamente este texto a este paciente desde `since`. */
async function hasRecentAssistantText({ remoteJid, content, since }) {
  if (!remoteJid || !content) return false;
  const found = await prisma.message.findFirst({
    where: { role: 'ASSISTANT', content, createdAt: { gte: since }, user: { remoteJid } },
    select: { id: true },
  });
  return Boolean(found);
}

module.exports = { saveMessage, getHistory, messageExistsByExternalId, hasRecentAssistantText, STAFF_PREFIX };
