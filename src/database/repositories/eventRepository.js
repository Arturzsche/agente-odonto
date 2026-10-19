const prisma = require('../prisma');
const { isUniqueViolation } = require('../errors');

/** Registra o ID do webhook. Retorna false se ele já tinha sido processado. */
async function markEventProcessed(eventId) {
  if (!eventId) return true;
  try {
    await prisma.processedEvent.create({ data: { id: eventId } });
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
}

/** Apaga registros antigos: a Evolution só reenvia eventos por alguns minutos. */
async function pruneProcessedEvents(olderThanDays = 7) {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const { count } = await prisma.processedEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return count;
}

module.exports = { markEventProcessed, pruneProcessedEvents };
