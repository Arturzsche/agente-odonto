const config = require('../config');
const logger = require('../utils/logger');
const { prisma, appointments, markSessionHighPriority } = require('../database');
const calendarService = require('./calendarService');

const durationMs = () => config.calendar.durationMin * 60 * 1000;

/**
 * Horários livres numa data: o que o calendário (mock ou Google) oferece, menos os horários
 * que já passaram e os que já têm consulta ativa no banco.
 */
async function consultarDisponibilidade(dataDesejada) {
  const result = await calendarService.consultarDisponibilidade(dataDesejada);
  if (result.erro) return result;

  const now = Date.now();
  const livres = [];
  for (const slot of result.horarios_disponiveis) {
    const start = new Date(calendarService.toClinicIso(slot));
    if (start.getTime() <= now) continue;
    const conflitos = await appointments.findOverlapping(start, new Date(start.getTime() + durationMs()));
    if (conflitos.length === 0) livres.push(slot);
  }

  return {
    data: result.data,
    horarios_disponiveis: livres,
    ...(livres.length === 0 && { observacao: 'Sem horários livres nesta data. Ofereça a data seguinte.' }),
  };
}

/**
 * Agenda a consulta: valida, cria o evento no calendário e grava o Appointment no PostgreSQL.
 * Um advisory lock por horário impede que dois pacientes reservem o mesmo horário ao mesmo tempo.
 * @param {{ nome_paciente: string, data_horario: string, motivo: string, emergencia?: boolean }} args
 * @param {{ userId: string, sessionId?: string, phone?: string }} ctx
 */
async function agendarConsulta(args, ctx) {
  const { nome_paciente, data_horario, motivo } = args;
  const iso = calendarService.toClinicIso(data_horario || '');
  if (!iso) {
    return { sucesso: false, erro: 'data_horario inválido. Use o formato "YYYY-MM-DD HH:mm".' };
  }
  if (!ctx?.userId) {
    return { sucesso: false, erro: 'Paciente não identificado na conversa.' };
  }

  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMs());
  if (start.getTime() <= Date.now()) {
    return { sucesso: false, erro: 'Esse horário já passou. Ofereça um horário futuro.' };
  }

  const result = await prisma.$transaction(
    async (tx) => {
      // Lock liberado automaticamente no fim da transação; a chave é o horário de início.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'agendamento:' + start.toISOString()}))`;

      const conflitos = await appointments.findOverlapping(start, end, tx);
      if (conflitos.length > 0) {
        return {
          sucesso: false,
          erro: 'Esse horário acabou de ser ocupado. Consulte a disponibilidade de novo e ofereça outro.',
        };
      }

      const result = await calendarService.agendarConsulta({ ...args, telefone: ctx.phone });
      if (!result.sucesso) return result;

      const appointment = await appointments.createAppointment(
        {
          userId: ctx.userId,
          sessionId: ctx.sessionId || null,
          patientName: nome_paciente.trim(),
          scheduledAt: start,
          durationMinutes: config.calendar.durationMin,
          reason: motivo.trim(),
          isEmergency: args.emergencia === true || /emerg/i.test(motivo),
          calendarEventId: result.calendarEventId || null,
        },
        tx,
      );
      logger.info(`[agenda] Consulta ${appointment.id} criada para ${appointment.patientName} em ${iso}`);

      return {
        sucesso: true,
        id_agendamento: appointment.id,
        nome_paciente: appointment.patientName,
        data_horario,
        motivo: appointment.reason,
        emergencia: appointment.isEmergency,
        mensagem: 'Consulta agendada com sucesso.',
      };
    },
    // A criação do evento no Google pode levar alguns segundos.
    { timeout: 20_000, maxWait: 10_000 },
  );

  // Agendamento de emergência: a conversa também ganha prioridade alta no painel da equipe.
  // Fora da transação e sem afetar a resposta: a consulta já está marcada.
  if (result.sucesso && result.emergencia && ctx.sessionId) {
    await markSessionHighPriority(ctx.sessionId).catch((err) =>
      logger.warn(`[agenda] Falha ao marcar prioridade alta na sessão ${ctx.sessionId}: ${err.message}`),
    );
  }
  return result;
}

module.exports = { consultarDisponibilidade, agendarConsulta };
