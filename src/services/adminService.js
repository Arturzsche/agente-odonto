/**
 * Consultas e mapeamentos da API administrativa (/api/admin), consumida pelo painel web.
 *
 * Os formatos devolvidos são EXATAMENTE os tipos de web/src/types/domain.ts e a semântica segue
 * docs/admin-api.md (contrato). Regras importantes:
 * - telefones sempre mascarados (o painel nunca recebe o número completo);
 * - dias e horas no fuso da clínica (CLINIC_TIMEZONE), calculados no PostgreSQL com AT TIME ZONE;
 * - agregações em poucas consultas (GROUP BY / subconsultas), sem N+1.
 *
 * O status exibido no painel é derivado da sessão (ver viewStatus / viewStatusSql, que precisam
 * ficar equivalentes): encerrada > em_atendimento_humano > aguardando_equipe > agente.
 */
const fs = require('fs');
const axios = require('axios');
const { Prisma } = require('@prisma/client');
const config = require('../config');
const db = require('../database');
const evolutionService = require('./evolutionService');
const sentMessages = require('./sentMessageRegistry');
const logger = require('../utils/logger');

const prisma = db.prisma;

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 };
/** Ordem fixa do statusBreakdown (sempre os 4 status, mesmo com 0). */
const CONVERSATION_STATUSES = ['encerrada', 'agente', 'em_atendimento_humano', 'aguardando_equipe'];
const APPOINTMENT_STATUS_TO_PANEL = {
  SCHEDULED: 'agendado',
  CONFIRMED: 'confirmado',
  COMPLETED: 'concluido',
  CANCELED: 'cancelado',
  NO_SHOW: 'faltou',
};
const APPOINTMENT_STATUS_FROM_PANEL = Object.fromEntries(
  Object.entries(APPOINTMENT_STATUS_TO_PANEL).map(([db, panel]) => [panel, db]),
);
const AUTHOR = { USER: 'paciente', ASSISTANT: 'agente', STAFF: 'equipe' };
const NO_NAME = 'Paciente sem nome';
const URGENT_REASON = 'Agendamento de urgência';
const PREVIEW_MAX = 140;
const MAX_CONVERSATION_MESSAGES = 500;
const AGENT_NAME = 'Sofia';

/** Erro com status HTTP e mensagem segura para o painel (convertido em JSON pela rota). */
class AdminError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'AdminError';
    this.status = status;
    this.code = code;
  }
}

const notFound = () => new AdminError(404, 'not_found', 'Registro não encontrado.');

/* ------------------------------- Utilidades ------------------------------- */

const timeoutMs = () => config.db.sessionTimeoutHours * 60 * 60 * 1000;
const tz = () => config.calendar.timezone;
const iso = (d) => (d instanceof Date ? d.toISOString() : d ? new Date(d).toISOString() : null);
const cleanName = (name) => (typeof name === 'string' && name.trim() ? name.trim() : null);

/** Mesma regra de web/src/lib/format.ts → maskPhone: "+55 11 9••••-4321". */
function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 8) return '••••';
  const last4 = digits.slice(-4);
  const ddd = digits.length >= 12 ? digits.slice(2, 4) : digits.slice(0, 2);
  return `+55 ${ddd} 9••••-${last4}`;
}

/** Última mensagem resumida em até 140 caracteres (sem cortar emojis ao meio). */
function preview(text) {
  const chars = Array.from(String(text || '').replace(/\s+/g, ' ').trim());
  if (chars.length <= PREVIEW_MAX) return chars.join('');
  return `${chars.slice(0, PREVIEW_MAX - 1).join('').trimEnd()}…`;
}

/** Dia (YYYY-MM-DD) de um instante no fuso da clínica. */
function localDay(date, timeZone = tz()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Aritmética de calendário pura sobre "YYYY-MM-DD" (sem fuso envolvido). */
function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/* ------------------------------ Fragmentos SQL ----------------------------- */

// Busca sem diferenciar maiúsculas/acentos sem depender da extensão "unaccent".
const ACCENTS_FROM = 'áàâãäåéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ';
const ACCENTS_TO = 'aaaaaaeeeeiiiiooooouuuucnaaaaaaeeeeiiiiooooouuuucn';
const fold = (expr) => Prisma.sql`translate(lower(${expr}), ${ACCENTS_FROM}, ${ACCENTS_TO})`;

/** Termo de busca normalizado como o fold() do SQL, já em padrão LIKE (com % e _ escapados). */
function likePattern(term) {
  const normalized = term
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  return `%${normalized.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** Instante como parâmetro timestamptz (ISO com "Z": independe do fuso da sessão do PostgreSQL). */
const tsz = (date) => Prisma.sql`${date.toISOString()}::timestamptz`;
/** Meia-noite (no fuso da clínica) do dia "YYYY-MM-DD", como timestamptz. */
const dayStart = (day) => Prisma.sql`((${day}::date)::timestamp AT TIME ZONE ${tz()})`;
const localDate = (column) => Prisma.sql`((${column} AT TIME ZONE ${tz()})::date)`;
const and = (conditions) => Prisma.join([Prisma.sql`TRUE`, ...conditions], ' AND ');

/** Status do painel calculado no banco. Deve ficar equivalente a viewStatus(). */
function viewStatusSql(now) {
  const cutoff = new Date(now.getTime() - timeoutMs());
  return Prisma.sql`CASE
    WHEN s.status = 'CLOSED' OR s.last_message_at < ${tsz(cutoff)} THEN 'encerrada'
    WHEN s.handoff_status = 'HUMAN_ACTIVE' AND s.human_active_until > ${tsz(now)} THEN 'em_atendimento_humano'
    WHEN s.handoff_status = 'REQUESTED' THEN 'aguardando_equipe'
    ELSE 'agente'
  END`;
}

/** Status do painel calculado em JS (para as escritas). Equivalente a viewStatusSql(). */
function viewStatus(session, now = new Date()) {
  if (session.status === 'CLOSED' || now.getTime() - session.lastMessageAt.getTime() > timeoutMs()) return 'encerrada';
  if (db.isHumanActive(session, now)) return 'em_atendimento_humano';
  if (session.handoffStatus === 'REQUESTED') return 'aguardando_equipe';
  return 'agente';
}

/* -------------------------------- Conversas -------------------------------- */

/**
 * Resumos de conversas numa única consulta (contagens e última mensagem por subconsulta
 * correlacionada, usando o índice messages(session_id, created_at)).
 */
async function fetchSummaryRows({ conditions = [], orderBy, limit, now }) {
  return prisma.$queryRaw`
    SELECT s.id, s.user_id AS "userId", s.started_at AS "startedAt", s.last_message_at AS "lastMessageAt",
           s.handoff_reason AS "handoffReason", s.handoff_requested_at AS "handoffRequestedAt",
           u.name AS "userName", u.phone AS "userPhone",
           v.view_status AS "viewStatus", v.high AS "high",
           (SELECT count(*)::int FROM messages m WHERE m.session_id = s.id) AS "messagesCount",
           lm.content AS "lastContent",
           CASE WHEN v.view_status = 'aguardando_equipe' THEN (
             SELECT count(*)::int FROM messages m
             WHERE m.session_id = s.id AND m.role = 'USER'
               AND m.created_at > COALESCE(
                 (SELECT max(m2.created_at) FROM messages m2 WHERE m2.session_id = s.id AND m2.role <> 'USER'),
                 '-infinity'::timestamptz)
           ) ELSE 0 END AS "unread"
    FROM chat_sessions s
    JOIN users u ON u.id = s.user_id
    CROSS JOIN LATERAL (
      SELECT ${viewStatusSql(now)} AS view_status,
             (s.priority = 'HIGH' OR EXISTS (
               SELECT 1 FROM appointments a WHERE a.session_id = s.id AND a.is_emergency
             )) AS high
    ) v
    LEFT JOIN LATERAL (
      SELECT m.content FROM messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1
    ) lm ON TRUE
    WHERE ${and(conditions)}
    ORDER BY ${orderBy}
    LIMIT ${limit}`;
}

function toSummary(row) {
  return {
    id: row.id,
    patient: { id: row.userId, name: cleanName(row.userName) || NO_NAME, phoneMasked: maskPhone(row.userPhone) },
    channel: 'whatsapp',
    status: row.viewStatus,
    priority: row.high ? 'alta' : 'normal',
    priorityReason: row.high ? cleanName(row.handoffReason) || URGENT_REASON : null,
    lastMessagePreview: preview(row.lastContent),
    lastMessageAt: iso(row.lastMessageAt),
    startedAt: iso(row.startedAt),
    messagesCount: row.messagesCount,
    unread: row.viewStatus === 'aguardando_equipe' ? row.unread : 0,
  };
}

const BY_LAST_MESSAGE = Prisma.sql`s.last_message_at DESC, s.id DESC`;
const BY_PRIORITY_THEN_LAST = Prisma.sql`v.high DESC, s.last_message_at DESC, s.id DESC`;

/**
 * @param {{ status?: string, priority?: 'normal'|'alta', q?: string, limit: number }} filters
 *        (status/priority já validados; "todas" chega como undefined)
 */
async function listConversations({ status, priority, q, limit }, now = new Date()) {
  const conditions = [];
  if (status) conditions.push(Prisma.sql`v.view_status = ${status}`);
  if (priority) conditions.push(priority === 'alta' ? Prisma.sql`v.high` : Prisma.sql`NOT v.high`);
  if (q) {
    const pattern = likePattern(q);
    conditions.push(Prisma.sql`(
      ${fold(Prisma.sql`coalesce(u.name, '')`)} LIKE ${pattern}
      OR EXISTS (SELECT 1 FROM messages mq WHERE mq.session_id = s.id AND ${fold(Prisma.sql`mq.content`)} LIKE ${pattern})
    )`);
  }
  const rows = await fetchSummaryRows({ conditions, orderBy: BY_LAST_MESSAGE, limit, now });
  return rows.map(toSummary);
}

async function getConversationSummary(id, now = new Date()) {
  const rows = await fetchSummaryRows({
    conditions: [Prisma.sql`s.id = ${id}::uuid`],
    orderBy: BY_LAST_MESSAGE,
    limit: 1,
    now,
  });
  return rows.length ? toSummary(rows[0]) : null;
}

function toChatMessage(message) {
  return {
    id: message.id,
    author: AUTHOR[message.role] || 'sistema',
    text: message.content,
    sentAt: iso(message.createdAt),
    isAudioTranscript: message.type === 'AUDIO',
  };
}

/** Conversa com as mensagens (as 500 mais recentes, em ordem cronológica). */
async function getConversation(id, now = new Date()) {
  const summary = await getConversationSummary(id, now);
  if (!summary) return null;
  const messages = await prisma.message.findMany({
    where: { sessionId: id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: MAX_CONVERSATION_MESSAGES,
    select: { id: true, role: true, type: true, content: true, createdAt: true },
  });
  return { ...summary, messages: messages.reverse().map(toChatMessage) };
}

/* ------------------------------- Agendamentos ------------------------------ */

async function fetchAppointmentRows({ conditions = [], orderBy = Prisma.sql`a.scheduled_at ASC, a.id ASC`, limit }) {
  return prisma.$queryRaw`
    SELECT a.id, a.user_id AS "userId", a.patient_name AS "patientName", u.name AS "userName",
           a.scheduled_at AS "scheduledAt", a.duration_minutes AS "durationMinutes", a.reason,
           a.is_emergency AS "isEmergency", a.status::text AS status, a.created_at AS "createdAt"
    FROM appointments a
    JOIN users u ON u.id = a.user_id
    WHERE ${and(conditions)}
    ORDER BY ${orderBy}
    LIMIT ${limit}`;
}

function toAppointment(row) {
  return {
    id: row.id,
    patient: { id: row.userId, name: cleanName(row.patientName) || cleanName(row.userName) || NO_NAME },
    professional: null,
    startsAt: iso(row.scheduledAt),
    durationMinutes: row.durationMinutes,
    category: row.isEmergency ? 'Urgência' : 'Avaliação inicial',
    reason: row.reason,
    status: APPOINTMENT_STATUS_TO_PANEL[row.status] || 'agendado',
    isEmergency: row.isEmergency,
    source: 'agente',
  };
}

/**
 * @param {{ from?: string, to?: string, status?: string, q?: string, limit: number }} filters
 *        from/to: "YYYY-MM-DD" no fuso da clínica (inclusive); status no formato do painel.
 */
async function listAppointments({ from, to, status, q, limit }) {
  const conditions = [];
  if (from) conditions.push(Prisma.sql`a.scheduled_at >= ${dayStart(from)}`);
  if (to) conditions.push(Prisma.sql`a.scheduled_at < ${dayStart(addDays(to, 1))}`);
  if (status) conditions.push(Prisma.sql`a.status::text = ${APPOINTMENT_STATUS_FROM_PANEL[status]}`);
  if (q) {
    const pattern = likePattern(q);
    conditions.push(Prisma.sql`(
      ${fold(Prisma.sql`a.patient_name`)} LIKE ${pattern}
      OR ${fold(Prisma.sql`coalesce(u.name, '')`)} LIKE ${pattern}
      OR ${fold(Prisma.sql`a.reason`)} LIKE ${pattern}
      OR ${fold(Prisma.sql`CASE WHEN a.is_emergency THEN 'Urgência' ELSE 'Avaliação inicial' END`)} LIKE ${pattern}
    )`);
  }
  const rows = await fetchAppointmentRows({ conditions, limit });
  return rows.map(toAppointment);
}

const ACTIVE_APPOINTMENT = Prisma.sql`a.status IN ('SCHEDULED', 'CONFIRMED')`;

/* --------------------------------- Pacientes -------------------------------- */

/** @param {{ q?: string, limit: number }} filters  q: nome ou dígitos do telefone */
async function listPatients({ q, limit }, now = new Date()) {
  const conditions = [];
  if (q) {
    const digits = q.replace(/\D/g, '');
    const byName = Prisma.sql`${fold(Prisma.sql`coalesce(u.name, '')`)} LIKE ${likePattern(q)}`;
    conditions.push(
      digits.length >= 2
        ? Prisma.sql`(${byName} OR regexp_replace(u.phone, '[^0-9]', '', 'g') LIKE ${`%${digits}%`})`
        : byName,
    );
  }

  const rows = await prisma.$queryRaw`
    SELECT u.id, u.name, u.phone,
           LEAST(u.created_at, COALESCE(st.first_started, u.created_at)) AS "firstContactAt",
           GREATEST(u.created_at, COALESCE(st.last_contact, u.created_at)) AS "lastContactAt",
           COALESCE(st.n, 0)::int AS "conversationsCount",
           COALESCE(ap.n, 0)::int AS "appointmentsCount",
           ap.next_at AS "nextAppointmentAt"
    FROM users u
    LEFT JOIN LATERAL (
      SELECT count(*) AS n, min(s.started_at) AS first_started, max(s.last_message_at) AS last_contact
      FROM chat_sessions s WHERE s.user_id = u.id
    ) st ON TRUE
    LEFT JOIN LATERAL (
      SELECT count(*) AS n,
             min(a.scheduled_at) FILTER (WHERE ${ACTIVE_APPOINTMENT} AND a.scheduled_at >= ${tsz(now)}) AS next_at
      FROM appointments a WHERE a.user_id = u.id
    ) ap ON TRUE
    WHERE ${and(conditions)}
    ORDER BY "lastContactAt" DESC, u.id DESC
    LIMIT ${limit}`;

  return rows.map((row) => ({
    id: row.id,
    name: cleanName(row.name) || NO_NAME,
    phoneMasked: maskPhone(row.phone),
    firstContactAt: iso(row.firstContactAt),
    lastContactAt: iso(row.lastContactAt),
    conversationsCount: row.conversationsCount,
    appointmentsCount: row.appointmentsCount,
    nextAppointmentAt: iso(row.nextAppointmentAt),
  }));
}

/* ------------------------------- Indicadores ------------------------------- */

/**
 * Janela do período em dias do fuso da clínica: hoje e os N-1 dias anteriores.
 * O período anterior tem o mesmo tamanho e termina onde o atual começa.
 */
function periodRange(period, now) {
  const days = PERIOD_DAYS[period];
  const today = localDay(now);
  const startDay = addDays(today, -(days - 1));
  return {
    days,
    startDay,
    today,
    start: dayStart(startDay),
    end: dayStart(addDays(today, 1)),
    prevStart: dayStart(addDays(startDay, -days)),
  };
}

/** Um ponto por dia do período (dias sem dados = 0), em uma consulta. */
async function fetchDaily(range) {
  const { start, end } = range;
  const rows = await prisma.$queryRaw`
    WITH days AS (
      SELECT (${range.startDay}::date + i) AS day FROM generate_series(0, ${range.days - 1}::int) AS i
    ),
    conv AS (
      SELECT ${localDate(Prisma.sql`s.started_at`)} AS day, count(*)::int AS n
      FROM chat_sessions s WHERE s.started_at >= ${start} AND s.started_at < ${end} GROUP BY 1
    ),
    appt AS (
      SELECT ${localDate(Prisma.sql`a.created_at`)} AS day, count(*)::int AS n
      FROM appointments a WHERE a.created_at >= ${start} AND a.created_at < ${end} GROUP BY 1
    ),
    esc AS (
      SELECT ${localDate(Prisma.sql`s.handoff_requested_at`)} AS day, count(*)::int AS n
      FROM chat_sessions s WHERE s.handoff_requested_at >= ${start} AND s.handoff_requested_at < ${end} GROUP BY 1
    )
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
           COALESCE(conv.n, 0) AS conversations, COALESCE(appt.n, 0) AS appointments, COALESCE(esc.n, 0) AS escalated
    FROM days d
    LEFT JOIN conv ON conv.day = d.day
    LEFT JOIN appt ON appt.day = d.day
    LEFT JOIN esc ON esc.day = d.day
    ORDER BY d.day`;
  return rows.map((r) => ({ day: r.day, conversations: r.conversations, appointments: r.appointments, escalated: r.escalated }));
}

/** Sessões iniciadas no período agrupadas pelo status atual (sempre os 4 status). */
async function fetchStatusBreakdown(range, now) {
  const rows = await prisma.$queryRaw`
    SELECT v.view_status AS status, count(*)::int AS n
    FROM chat_sessions s
    CROSS JOIN LATERAL (SELECT ${viewStatusSql(now)} AS view_status) v
    WHERE s.started_at >= ${range.start} AND s.started_at < ${range.end}
    GROUP BY 1`;
  const counts = new Map(rows.map((r) => [r.status, r.n]));
  return CONVERSATION_STATUSES.map((status) => ({ status, count: counts.get(status) || 0 }));
}

async function fetchKpis(range, now) {
  const { start, end, prevStart } = range;
  const cutoff = new Date(now.getTime() - timeoutMs());
  const [row] = await prisma.$queryRaw`
    SELECT
      (SELECT count(*)::int FROM chat_sessions s WHERE s.started_at >= ${start} AND s.started_at < ${end}) AS "convCur",
      (SELECT count(*)::int FROM chat_sessions s WHERE s.started_at >= ${prevStart} AND s.started_at < ${start}) AS "convPrev",
      (SELECT count(*)::int FROM chat_sessions s
        WHERE s.status = 'ACTIVE' AND s.handoff_status = 'REQUESTED' AND s.last_message_at >= ${tsz(cutoff)}) AS "waiting",
      (SELECT count(*)::int FROM appointments a
        WHERE a.status <> 'CANCELED' AND a.created_at >= ${start} AND a.created_at < ${end}) AS "apptCur",
      (SELECT count(*)::int FROM appointments a
        WHERE a.status <> 'CANCELED' AND a.created_at >= ${prevStart} AND a.created_at < ${start}) AS "apptPrev",
      (SELECT count(*)::int FROM chat_sessions s
        WHERE s.handoff_requested_at >= ${start} AND s.handoff_requested_at < ${end}) AS "escCur",
      (SELECT count(*)::int FROM chat_sessions s
        WHERE s.handoff_requested_at >= ${prevStart} AND s.handoff_requested_at < ${start}) AS "escPrev"`;

  return [
    {
      id: 'conversas_recebidas',
      label: 'Conversas recebidas',
      value: row.convCur,
      previousValue: row.convPrev,
      definition: 'Atendimentos iniciados por pacientes no período, em qualquer horário.',
    },
    {
      id: 'aguardando_equipe',
      label: 'Aguardando a equipe',
      value: row.waiting,
      previousValue: null,
      definition: 'Conversas que precisam de uma pessoa e ainda não foram assumidas. Valor atual, não do período.',
    },
    {
      id: 'agendamentos_confirmados',
      label: 'Agendamentos confirmados',
      value: row.apptCur,
      previousValue: row.apptPrev,
      definition: 'Consultas marcadas no período que não foram canceladas.',
    },
    {
      id: 'intervencao_humana',
      label: 'Precisaram da equipe',
      value: row.escCur,
      previousValue: row.escPrev,
      definition: 'Conversas encaminhadas para uma pessoa da equipe no período (urgências, dúvidas que o agente não sabe responder ou pedido do paciente).',
    },
  ];
}

async function getOverview(period, now = new Date()) {
  const range = periodRange(period, now);
  const [kpis, daily, statusBreakdown, upcoming, attention] = await Promise.all([
    fetchKpis(range, now),
    fetchDaily(range),
    fetchStatusBreakdown(range, now),
    fetchAppointmentRows({ conditions: [ACTIVE_APPOINTMENT, Prisma.sql`a.scheduled_at >= ${tsz(now)}`], limit: 6 }),
    fetchSummaryRows({
      conditions: [Prisma.sql`v.view_status IN ('aguardando_equipe', 'em_atendimento_humano')`],
      orderBy: BY_PRIORITY_THEN_LAST,
      limit: 5,
      now,
    }),
  ]);
  return {
    period,
    kpis,
    daily,
    statusBreakdown,
    upcomingAppointments: upcoming.map(toAppointment),
    attentionConversations: attention.map(toSummary),
  };
}

/* ---------------------------- Expediente da clínica ---------------------------- */

const hhmm = (h, m = 0) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const clampHour = (h) => Math.min(24, Math.max(0, h));

/** CLINIC_SATURDAY_HOURS ("08:00-12:00") -> { opens, closes } ou null (fechado / inválido). */
function parseSaturdayHours(value) {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(value);
  if (match) {
    const [oh, om, ch, cm] = match.slice(1).map(Number);
    const open = oh * 60 + om;
    const close = ch * 60 + cm;
    if (oh <= 23 && om < 60 && ch <= 24 && cm < 60 && close <= 24 * 60 && open < close) {
      return { opens: hhmm(oh, om), closes: hhmm(ch, cm) };
    }
  }
  logger.warn(`[admin] CLINIC_SATURDAY_HOURS inválido ("${value}"): use o formato 08:00-12:00. Sábado será exibido como fechado.`);
  return null;
}

let saturdayCache;
function businessHours() {
  if (saturdayCache === undefined || saturdayCache.raw !== config.clinic.saturdayHours) {
    saturdayCache = { raw: config.clinic.saturdayHours, value: parseSaturdayHours(config.clinic.saturdayHours) };
  }
  const opens = hhmm(clampHour(config.calendar.openHour));
  const closes = hhmm(clampHour(config.calendar.closeHour));
  const saturday = saturdayCache.value;
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
    if (weekday === 0) return { weekday, opens: null, closes: null };
    if (weekday === 6) return { weekday, opens: saturday?.opens ?? null, closes: saturday?.closes ?? null };
    return { weekday, opens, closes };
  });
}

function getSettings() {
  return {
    id: 'clinica',
    name: config.clinic.name,
    timezone: tz(),
    phoneDisplay: null,
    address: config.clinic.address,
    businessHours: businessHours(),
    agent: {
      name: AGENT_NAME,
      afterHours: true,
      sessionTimeoutHours: config.db.sessionTimeoutHours,
      escalateUrgent: true,
    },
  };
}

/* --------------------------------- Relatórios -------------------------------- */

async function fetchHourly(range) {
  const rows = await prisma.$queryRaw`
    SELECT extract(hour FROM (s.started_at AT TIME ZONE ${tz()}))::int AS hour, count(*)::int AS n
    FROM chat_sessions s
    WHERE s.started_at >= ${range.start} AND s.started_at < ${range.end}
    GROUP BY 1`;
  const counts = new Map(rows.map((r) => [r.hour, r.n]));
  return Array.from({ length: 24 }, (_, hour) => ({ hour, conversations: counts.get(hour) || 0 }));
}

/** Fração das sessões iniciadas fora do expediente configurado (seg–sex, sábado opcional). */
async function fetchAfterHoursShare(range) {
  const hours = businessHours();
  const weekday = hours[1];
  // Sábado fechado: intervalo vazio (00:00–00:00) => nenhuma hora conta como expediente.
  const saturday = hours[6].opens ? hours[6] : { opens: '00:00', closes: '00:00' };
  const [row] = await prisma.$queryRaw`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE NOT (CASE
             WHEN extract(isodow FROM l.t) BETWEEN 1 AND 5
               THEN l.t::time >= ${weekday.opens}::time AND l.t::time < ${weekday.closes}::time
             WHEN extract(isodow FROM l.t) = 6
               THEN l.t::time >= ${saturday.opens}::time AND l.t::time < ${saturday.closes}::time
             ELSE FALSE
           END))::int AS "afterHours"
    FROM chat_sessions s
    CROSS JOIN LATERAL (SELECT s.started_at AT TIME ZONE ${tz()} AS t) l
    WHERE s.started_at >= ${range.start} AND s.started_at < ${range.end}`;
  return row.total ? row.afterHours / row.total : 0;
}

async function fetchAppointmentsByCategory(range) {
  const rows = await prisma.$queryRaw`
    SELECT a.is_emergency AS "isEmergency", count(*)::int AS n
    FROM appointments a
    WHERE a.created_at >= ${range.start} AND a.created_at < ${range.end}
    GROUP BY 1`;
  return rows
    .map((r) => ({ category: r.isEmergency ? 'Urgência' : 'Avaliação inicial', count: r.n }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
}

async function getReports(period, now = new Date()) {
  const range = periodRange(period, now);
  const [daily, statusBreakdown, byHour, afterHoursShare, appointmentsByCategory] = await Promise.all([
    fetchDaily(range),
    fetchStatusBreakdown(range, now),
    fetchHourly(range),
    fetchAfterHoursShare(range),
    fetchAppointmentsByCategory(range),
  ]);
  // Todos os agendamentos são feitos pelo agente nesta versão (a equipe ainda não agenda pelo painel).
  const total = appointmentsByCategory.reduce((sum, c) => sum + c.count, 0);
  return {
    period,
    daily,
    statusBreakdown,
    byHour,
    afterHoursShare,
    appointmentsByCategory,
    appointmentsBySource: [
      { source: 'agente', count: total },
      { source: 'equipe', count: 0 },
    ],
  };
}

/* -------------------------------- Integrações -------------------------------- */

async function checkWhatsapp(checkedAt) {
  const base = {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Recebe e envia mensagens pelo número da clínica (Evolution API).',
    lastCheckedAt: checkedAt,
  };
  const { baseUrl, apiKey, instance } = config.evolution;
  if (!baseUrl) {
    return {
      ...base,
      status: 'pendente',
      detail: 'Modo simulação: mensagens não são enviadas',
      setupHint: 'No .env do agente, defina EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE e conecte o número com "npm run whatsapp:conectar".',
    };
  }
  try {
    const { data } = await axios.get(`${baseUrl}/instance/connectionState/${encodeURIComponent(instance)}`, {
      headers: { apikey: apiKey },
      timeout: 5000,
    });
    const state = String(data?.instance?.state ?? data?.state ?? '').toLowerCase();
    if (state === 'open') {
      return { ...base, status: 'conectado', detail: `Instância ${instance} · conectada`, setupHint: null };
    }
    if (state === 'connecting') {
      return {
        ...base,
        status: 'pendente',
        detail: `Instância ${instance} · aguardando conexão`,
        setupHint: 'Leia o QR Code com o WhatsApp da clínica (npm run whatsapp:conectar).',
      };
    }
    return {
      ...base,
      status: 'erro',
      detail: `Instância ${instance} · desconectada`,
      setupHint: 'Reconecte o número da clínica lendo o QR Code (npm run whatsapp:conectar).',
    };
  } catch (err) {
    const detail = err.response ? `HTTP ${err.response.status}` : err.code || err.message;
    logger.warn(`[admin] Falha ao consultar o estado da instância na Evolution: ${detail}`);
    return {
      ...base,
      status: 'erro',
      detail: 'Não foi possível consultar a Evolution API',
      setupHint: 'Verifique se a Evolution API está no ar (docker compose ps) e se EVOLUTION_API_URL e EVOLUTION_API_KEY estão corretos.',
    };
  }
}

function checkCalendar(checkedAt) {
  const base = {
    id: 'agenda',
    name: 'Google Agenda',
    description: 'Consulta horários livres e registra as consultas marcadas pelo agente.',
    lastCheckedAt: checkedAt,
  };
  const { enabled, credentialsPath, calendarId } = config.calendar;
  let credentialsOk = false;
  try {
    credentialsOk = Boolean(credentialsPath) && fs.statSync(credentialsPath).isFile();
  } catch {
    credentialsOk = false;
  }
  if (enabled && credentialsOk) {
    return { ...base, status: 'conectado', detail: `Google Agenda · ${calendarId}`, setupHint: null };
  }
  return {
    ...base,
    status: 'pendente',
    detail: 'Horários simulados',
    setupHint: 'No backend do agente, defina GOOGLE_CALENDAR_ENABLED=true e GOOGLE_APPLICATION_CREDENTIALS com o JSON da conta de serviço.',
  };
}

function checkAi(checkedAt) {
  const base = {
    id: 'ia',
    name: 'Provedor de IA',
    description: 'Interpreta as mensagens e redige as respostas do agente.',
    lastCheckedAt: checkedAt,
  };
  if (config.openai.apiKey) {
    return {
      ...base,
      status: 'conectado',
      detail: `Chave configurada (conectividade não verificada) · ${config.openai.chatModel}`,
      setupHint: null,
    };
  }
  return {
    ...base,
    status: 'pendente',
    detail: 'Chave da OpenAI não configurada',
    setupHint: 'Defina OPENAI_API_KEY no .env do agente.',
  };
}

async function checkDatabase(checkedAt) {
  const base = {
    id: 'banco',
    name: 'Banco de dados',
    description: 'Guarda conversas, pacientes e agendamentos (PostgreSQL).',
    lastCheckedAt: checkedAt,
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ...base, status: 'conectado', detail: 'PostgreSQL respondendo', setupHint: null };
  } catch (err) {
    logger.warn(`[admin] Falha no SELECT 1 do banco: ${err.message}`);
    return {
      ...base,
      status: 'erro',
      detail: 'PostgreSQL não respondeu',
      setupHint: 'Confira se o PostgreSQL está no ar e rode "npm run db:diagnostico" no backend do agente.',
    };
  }
}

async function getIntegrations(now = new Date()) {
  const checkedAt = now.toISOString();
  return Promise.all([checkWhatsapp(checkedAt), checkCalendar(checkedAt), checkAi(checkedAt), checkDatabase(checkedAt)]);
}

/* -------------------------------- Notificações ------------------------------- */

const MAX_NOTIFICATIONS = 30;

/**
 * Notificações derivadas do estado atual (o backend não guarda "lidas"):
 * conversas aguardando a equipe e próximas consultas de urgência.
 */
async function getNotifications(now = new Date()) {
  const [waiting, emergencies] = await Promise.all([
    fetchSummaryRows({
      conditions: [Prisma.sql`v.view_status = 'aguardando_equipe'`],
      orderBy: BY_PRIORITY_THEN_LAST,
      limit: MAX_NOTIFICATIONS,
      now,
    }),
    fetchAppointmentRows({
      conditions: [ACTIVE_APPOINTMENT, Prisma.sql`a.is_emergency`, Prisma.sql`a.scheduled_at >= ${tsz(now)}`],
      orderBy: Prisma.sql`a.created_at DESC, a.id DESC`,
      limit: 10,
    }),
  ]);

  const items = [
    ...waiting.map((row) => {
      const c = toSummary(row);
      return {
        id: `n-${c.id}`,
        title: c.priority === 'alta' ? `Prioridade: ${c.patient.name}` : `${c.patient.name} aguarda a equipe`,
        description: c.priorityReason || cleanName(row.handoffReason) || c.lastMessagePreview,
        createdAt: iso(row.handoffRequestedAt || row.lastMessageAt),
        href: `/dashboard/conversas?id=${c.id}`,
        read: false,
      };
    }),
    ...emergencies.map((row) => {
      const a = toAppointment(row);
      return {
        id: `n-${a.id}`,
        title: 'Consulta de urgência agendada',
        description: `${a.patient.name} · ${a.reason}`,
        createdAt: iso(row.createdAt),
        href: `/dashboard/agendamentos?q=${encodeURIComponent(a.patient.name)}`,
        read: false,
      };
    }),
  ];
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_NOTIFICATIONS);
}

/* ---------------------------------- Escritas --------------------------------- */

/**
 * assumir | devolver | encerrar. A linha da sessão é travada (FOR UPDATE) para não competir com
 * a ferramenta encaminhar_para_equipe (db.requestHandoff), que trava a mesma linha.
 * @returns {Promise<object>} ConversationSummary atualizado
 */
async function applyHandoffAction(id, action, now = new Date()) {
  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw`SELECT id FROM chat_sessions WHERE id = ${id}::uuid FOR UPDATE`;
    if (locked.length === 0) throw notFound();
    const session = await tx.chatSession.findUnique({ where: { id } });

    if (action === 'encerrar') {
      // Idempotente: encerrar uma conversa já encerrada não muda nada.
      if (session.status !== 'CLOSED') {
        await tx.chatSession.update({
          where: { id },
          data: { status: 'CLOSED', endedAt: now, handoffStatus: 'NONE', humanActiveUntil: null },
        });
      }
      return;
    }

    if (viewStatus(session, now) === 'encerrada') {
      throw new AdminError(
        409,
        'conversation_closed',
        'Esta conversa já foi encerrada. Uma nova mensagem do paciente abre um novo atendimento.',
      );
    }

    if (action === 'assumir') {
      const until = db.humanActiveUntilFrom(now);
      // Nunca encurta uma pausa maior que já esteja valendo.
      const keepCurrent = db.isHumanActive(session, until);
      await tx.chatSession.update({
        where: { id },
        data: { handoffStatus: 'HUMAN_ACTIVE', humanActiveUntil: keepCurrent ? session.humanActiveUntil : until },
      });
    } else {
      // devolver: o agente volta a responder.
      await tx.chatSession.update({ where: { id }, data: { handoffStatus: 'NONE', humanActiveUntil: null } });
    }
  });

  logger.info(`[admin] ${action} sessão=${id}`);
  return getConversationSummary(id);
}

/**
 * Envia uma mensagem da equipe ao paciente pela Evolution (sendText), grava como STAFF com o ID do
 * envio e marca a conversa como HUMAN_ACTIVE. Falha no envio => 502 e nada é gravado.
 * Só é permitido no atendimento mais recente do paciente; se ele estiver encerrado, é reaberto
 * (a própria mensagem renova o "último contato").
 * @returns {Promise<object>} ChatMessage criado
 */
async function sendStaffMessage(id, text, now = new Date()) {
  const session = await prisma.chatSession.findUnique({
    where: { id },
    include: { user: { select: { id: true, phone: true } } },
  });
  if (!session) throw notFound();

  const latest = await prisma.chatSession.findFirst({
    where: { userId: session.userId },
    orderBy: [{ startedAt: 'desc' }, { lastMessageAt: 'desc' }],
    select: { id: true },
  });
  if (latest.id !== session.id) {
    throw new AdminError(
      409,
      'conversation_outdated',
      'Este paciente tem um atendimento mais recente. Envie a mensagem pela conversa mais recente.',
    );
  }

  let sent;
  try {
    sent = await evolutionService.sendText(session.user.phone, text);
  } catch (err) {
    const detail = err.response ? `HTTP ${err.response.status}` : err.code || err.message;
    logger.error(`[admin] Falha ao enviar mensagem da equipe sessão=${id}: ${detail}`);
    throw new AdminError(502, 'send_failed', 'Não foi possível enviar a mensagem pelo WhatsApp. Tente novamente.');
  }

  // O sendText já registra o ID; registrar de novo é inofensivo e deixa explícito que o eco
  // "fromMe" desta mensagem (que volta pelo webhook) é do sistema, não uma resposta externa.
  const externalId = sent?.key?.id || null;
  sentMessages.registerSentMessageId(externalId);

  const { message } = await db.saveStaffMessage(
    { sessionId: session.id, userId: session.userId, content: text, externalId, reopen: session.status === 'CLOSED' },
    now,
  );
  logger.info(`[admin] enviar_mensagem sessão=${id}${sent?.simulated ? ' (modo simulação)' : ''}`);
  return toChatMessage(message);
}

module.exports = {
  AdminError,
  PERIOD_DAYS,
  CONVERSATION_STATUSES,
  APPOINTMENT_STATUSES: Object.values(APPOINTMENT_STATUS_TO_PANEL),
  maskPhone,
  preview,
  localDay,
  addDays,
  viewStatus,
  listConversations,
  getConversation,
  getConversationSummary,
  listAppointments,
  listPatients,
  getOverview,
  getReports,
  getIntegrations,
  getSettings,
  getNotifications,
  applyHandoffAction,
  sendStaffMessage,
};
