/**
 * Datas "de calendário" da clínica, sem fuso: "2026-10-20" e "2026-10-20T14:05".
 * Os cálculos usam UTC internamente só como aritmética de calendário.
 */

const MS_DAY = 86_400_000;

const toUTC = (date: string) => {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (date: string, days: number) => fromUTC(toUTC(date) + days * MS_DAY);
export const diffDays = (a: string, b: string) => Math.round((toUTC(a) - toUTC(b)) / MS_DAY);
/** 0 = domingo … 6 = sábado. */
export const weekday = (date: string) => new Date(toUTC(date)).getUTCDay();
export const datePart = (dateTime: string) => dateTime.slice(0, 10);
export const timePart = (dateTime: string) => dateTime.slice(11, 16);

/** "Agora" na hora local do fuso informado, como "2026-10-20T14:05". */
export function nowInTimeZone(timeZone: string, at = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" });
const fmtShort = fmt({ day: "2-digit", month: "2-digit" });
const fmtLong = fmt({ weekday: "long", day: "numeric", month: "long" });
const fmtWeekdayShort = fmt({ weekday: "short" });
const fmtMonth = fmt({ month: "long", year: "numeric" });
const fmtDayMonth = fmt({ day: "numeric", month: "short" });

/** "20/10" */
export const formatShortDate = (date: string) => fmtShort.format(toUTC(date));
/** "terça-feira, 20 de outubro" */
export const formatLongDate = (date: string) => fmtLong.format(toUTC(date));
/** "ter." */
export const formatWeekdayShort = (date: string) => fmtWeekdayShort.format(toUTC(date));
/** "outubro de 2026" */
export const formatMonth = (date: string) => fmtMonth.format(toUTC(date));
/** "20 de out." */
export const formatDayMonth = (date: string) => fmtDayMonth.format(toUTC(date));

/** Rótulo relativo para listas: "14:05", "Ontem", "seg.", "12/10". */
export function formatRelative(dateTime: string, now: string) {
  const days = diffDays(datePart(now), datePart(dateTime));
  if (days === 0) return timePart(dateTime);
  if (days === 1) return "Ontem";
  if (days < 7) return formatWeekdayShort(dateTime);
  return formatShortDate(dateTime);
}

/** "Hoje", "Amanhã", "Ontem" ou a data curta com o dia da semana. */
export function formatDayLabel(date: string, today: string) {
  const days = diffDays(date, today);
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  if (days === -1) return "Ontem";
  return `${formatWeekdayShort(date).replace(".", "")}, ${formatShortDate(date)}`;
}

/** Semanas (domingo a sábado) que cobrem o mês da data informada. */
export function monthGrid(date: string): string[][] {
  const first = startOfMonth(date);
  const last = addDays(addMonths(first, 1), -1);
  const weeks: string[][] = [];
  for (let cursor = addDays(first, -weekday(first)); cursor <= addDays(last, 6 - weekday(last)); cursor = addDays(cursor, 1)) {
    if (weekday(cursor) === 0) weeks.push([]);
    weeks[weeks.length - 1].push(cursor);
  }
  return weeks;
}

export function startOfMonth(date: string) {
  return `${date.slice(0, 7)}-01`;
}
export function addMonths(date: string, months: number) {
  const [y, m] = date.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}
