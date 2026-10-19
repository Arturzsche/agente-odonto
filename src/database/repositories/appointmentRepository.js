const prisma = require('../prisma');

// Status que ocupam o horário na agenda.
const ACTIVE_STATUSES = ['SCHEDULED', 'CONFIRMED'];

/** Consultas ativas que se sobrepõem ao intervalo [start, end). */
async function findOverlapping(start, end, client = prisma) {
  // Busca com folga de 24h antes (maior duração razoável) e filtra a sobreposição exata em memória,
  // já que a duração de cada consulta é guardada por registro.
  const candidates = await client.appointment.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
      scheduledAt: { lt: end, gte: new Date(start.getTime() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { scheduledAt: 'asc' },
  });
  return candidates.filter(
    (a) => a.scheduledAt.getTime() + a.durationMinutes * 60 * 1000 > start.getTime(),
  );
}

async function createAppointment(data, client = prisma) {
  return client.appointment.create({ data });
}

/** Próximas consultas ativas do paciente (útil para a IA e para lembretes). */
async function findUpcomingByUser(userId, from = new Date()) {
  return prisma.appointment.findMany({
    where: { userId, status: { in: ACTIVE_STATUSES }, scheduledAt: { gte: from } },
    orderBy: { scheduledAt: 'asc' },
  });
}

module.exports = { findOverlapping, createAppointment, findUpcomingByUser, ACTIVE_STATUSES };
