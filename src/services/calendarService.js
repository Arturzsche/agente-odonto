const fs = require('fs');
const { google } = require('googleapis');
const config = require('../config');
const logger = require('../utils/logger');

const { timezone, openHour, closeHour, durationMin } = config.calendar;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Helpers de data/fuso
// ---------------------------------------------------------------------------

/** Data de hoje (YYYY-MM-DD) no fuso da clínica. */
function todayInClinicTz() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

/** Offset do fuso da clínica, ex.: "-03:00". */
function tzOffset(date = new Date()) {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName').value; // "GMT-03:00" ou "GMT"
  return part === 'GMT' ? '+00:00' : part.replace('GMT', '');
}

/** Converte "YYYY-MM-DD HH:mm" (ou ISO sem fuso) para ISO com o offset da clínica. */
function toClinicIso(dataHorario) {
  const match = String(dataHorario).trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) return null;
  const [, date, hh, mm] = match;
  return `${date}T${hh}:${mm}:00${tzOffset(new Date(`${date}T12:00:00Z`))}`;
}

function validateDate(dataDesejada) {
  if (!DATE_RE.test(dataDesejada || '')) {
    return 'Formato de data inválido. Use YYYY-MM-DD.';
  }
  if (dataDesejada < todayInClinicTz()) {
    return 'A data informada já passou. Peça ao paciente uma data futura.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// MOCK (padrão para testes locais)
// ---------------------------------------------------------------------------

const mock = {
  async consultarDisponibilidade(dataDesejada) {
    return {
      data: dataDesejada,
      horarios_disponiveis: [`${dataDesejada} 09:00`, `${dataDesejada} 14:30`],
      fonte: 'mock',
    };
  },

  async agendarConsulta({ nome_paciente, data_horario, motivo, telefone }) {
    return {
      sucesso: true,
      calendarEventId: null,
      nome_paciente,
      data_horario,
      motivo,
      telefone,
      mensagem: 'Consulta agendada com sucesso.',
    };
  },
};

// ---------------------------------------------------------------------------
// GOOGLE CALENDAR REAL (ativado com GOOGLE_CALENDAR_ENABLED=true)
// ---------------------------------------------------------------------------

let calendarClient;

function getCalendarClient() {
  if (calendarClient) return calendarClient;
  const keyFile = config.calendar.credentialsPath;
  if (!keyFile || !fs.existsSync(keyFile)) {
    throw new Error(`Credenciais do Google não encontradas em "${keyFile}".`);
  }
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  calendarClient = google.calendar({ version: 'v3', auth });
  return calendarClient;
}

const pad = (n) => String(n).padStart(2, '0');

const googleCalendar = {
  async consultarDisponibilidade(dataDesejada) {
    const calendar = getCalendarClient();
    const offset = tzOffset(new Date(`${dataDesejada}T12:00:00Z`));
    const timeMin = `${dataDesejada}T${pad(openHour)}:00:00${offset}`;
    const timeMax = `${dataDesejada}T${pad(closeHour)}:00:00${offset}`;

    const { data } = await calendar.freebusy.query({
      requestBody: { timeMin, timeMax, timeZone: timezone, items: [{ id: config.calendar.calendarId }] },
    });
    const busy = (data.calendars[config.calendar.calendarId]?.busy || []).map((b) => ({
      start: new Date(b.start).getTime(),
      end: new Date(b.end).getTime(),
    }));

    const now = Date.now();
    const slots = [];
    for (let min = openHour * 60; min + durationMin <= closeHour * 60; min += durationMin) {
      const label = `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
      const start = new Date(`${dataDesejada}T${label}:00${offset}`).getTime();
      const end = start + durationMin * 60 * 1000;
      const overlaps = busy.some((b) => start < b.end && end > b.start);
      if (!overlaps && start > now) slots.push(`${dataDesejada} ${label}`);
    }

    return { data: dataDesejada, horarios_disponiveis: slots.slice(0, 4), fonte: 'google' };
  },

  async agendarConsulta({ nome_paciente, data_horario, motivo, telefone }) {
    const calendar = getCalendarClient();
    const startIso = toClinicIso(data_horario);
    const end = new Date(new Date(startIso).getTime() + durationMin * 60 * 1000);

    const { data } = await calendar.events.insert({
      calendarId: config.calendar.calendarId,
      requestBody: {
        summary: `Avaliação - ${nome_paciente}`,
        description: `Motivo: ${motivo}\nWhatsApp: ${telefone || 'n/d'}\nAgendado pelo assistente virtual.`,
        start: { dateTime: startIso, timeZone: timezone },
        end: { dateTime: end.toISOString(), timeZone: timezone },
      },
    });

    return {
      sucesso: true,
      calendarEventId: data.id,
      nome_paciente,
      data_horario,
      motivo,
      link: data.htmlLink,
      mensagem: 'Consulta agendada com sucesso.',
    };
  },
};

// ---------------------------------------------------------------------------
// API pública do serviço (usada pelas tools da IA)
// ---------------------------------------------------------------------------

const provider = () => (config.calendar.enabled ? googleCalendar : mock);

async function consultarDisponibilidade(dataDesejada) {
  const invalid = validateDate(dataDesejada);
  if (invalid) return { erro: invalid };
  return provider().consultarDisponibilidade(dataDesejada);
}

async function agendarConsulta({ nome_paciente, data_horario, motivo, telefone }) {
  if (!nome_paciente || !data_horario || !motivo) {
    return { sucesso: false, erro: 'Parâmetros obrigatórios: nome_paciente, data_horario e motivo.' };
  }
  if (!toClinicIso(data_horario)) {
    return { sucesso: false, erro: 'data_horario inválido. Use o formato "YYYY-MM-DD HH:mm".' };
  }
  const invalid = validateDate(String(data_horario).slice(0, 10));
  if (invalid) return { sucesso: false, erro: invalid };

  return provider().agendarConsulta({ nome_paciente, data_horario, motivo, telefone });
}

logger.info(`[calendar] Modo: ${config.calendar.enabled ? 'Google Calendar real' : 'MOCK'}`);

module.exports = { consultarDisponibilidade, agendarConsulta, todayInClinicTz, toClinicIso };
