const prisma = require('./prisma');
const logger = require('../utils/logger');
const { isMissingTable, isMissingColumn } = require('./errors');
const { upsertUser } = require('./repositories/userRepository');
const { getOrCreateActiveSession, findOpenSession } = require('./repositories/sessionRepository');
const {
  saveMessage,
  getHistory,
  messageExistsByExternalId,
  hasRecentAssistantText,
} = require('./repositories/messageRepository');
const appointments = require('./repositories/appointmentRepository');
const handoff = require('./repositories/handoffRepository');
const { markEventProcessed, pruneProcessedEvents } = require('./repositories/eventRepository');

const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
let pruneTimer;

/** Conecta ao PostgreSQL e confere se as migrações foram aplicadas. */
async function initDatabase() {
  try {
    await prisma.$connect();
    await prisma.user.count(); // falha com P2021 se as tabelas não existirem
    // Falha com P2022 se a migração do encaminhamento para a equipe ainda não foi aplicada.
    await prisma.chatSession.findFirst({ select: { handoffStatus: true } });
  } catch (err) {
    if (isMissingTable(err)) {
      throw new Error('Tabelas não encontradas. Rode "npm run db:migrate" antes de iniciar o servidor.');
    }
    if (isMissingColumn(err)) {
      throw new Error('Banco desatualizado (migrações pendentes). Rode "npm run db:migrate" antes de iniciar o servidor.');
    }
    throw new Error(
      `Não foi possível conectar ao PostgreSQL (DATABASE_URL): ${err.message}\n` +
        'Para descobrir e corrigir a causa, rode: npm run db:diagnostico -- --corrigir',
    );
  }

  const prune = () =>
    pruneProcessedEvents()
      .then((n) => n && logger.info(`[db] ${n} eventos antigos removidos.`))
      .catch((err) => logger.warn('[db] Falha ao limpar eventos antigos:', err.message));
  prune();
  pruneTimer = setInterval(prune, PRUNE_INTERVAL_MS).unref();

  logger.info('[db] PostgreSQL (Prisma) conectado.');
}

async function closeDatabase() {
  clearInterval(pruneTimer);
  await prisma.$disconnect();
}

module.exports = {
  prisma,
  initDatabase,
  closeDatabase,
  upsertUser,
  getOrCreateActiveSession,
  findOpenSession,
  saveMessage,
  getHistory,
  messageExistsByExternalId,
  hasRecentAssistantText,
  markEventProcessed,
  appointments,
  // Encaminhamento para a equipe / atendimento humano
  isHumanActive: handoff.isHumanActive,
  humanActiveUntilFrom: handoff.humanActiveUntilFrom,
  requestHandoff: handoff.requestHandoff,
  saveStaffMessage: handoff.saveStaffMessage,
  releaseExpiredHumanHandoff: handoff.releaseExpiredHumanHandoff,
  isSessionHumanActive: handoff.isSessionHumanActive,
  markSessionHighPriority: handoff.markSessionHighPriority,
};
