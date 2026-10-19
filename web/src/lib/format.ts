/**
 * Formatação pt-BR. Datas são sempre exibidas no fuso da clínica (não no do navegador),
 * para que servidor e cliente rendam o mesmo texto.
 */
export const CLINIC_TIMEZONE = "America/Sao_Paulo";
const LOCALE = "pt-BR";

const dateFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: CLINIC_TIMEZONE, day: "2-digit", month: "2-digit", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: CLINIC_TIMEZONE, day: "2-digit", month: "short" });
const weekdayFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: CLINIC_TIMEZONE, weekday: "short", day: "2-digit", month: "short" });
const timeFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: CLINIC_TIMEZONE, hour: "2-digit", minute: "2-digit" });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: CLINIC_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const isoDayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: CLINIC_TIMEZONE });
const numberFmt = new Intl.NumberFormat(LOCALE);
const percentFmt = new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 0 });

const toDate = (value: string | number | Date) => (value instanceof Date ? value : new Date(value));

/** 19/10/2026 */
export const formatDate = (value: string | Date) => dateFmt.format(toDate(value));
/** 19 de out. */
export const formatShortDate = (value: string | Date) => shortDateFmt.format(toDate(value)).replace(".", "");
/** seg., 19 de out. */
export const formatWeekday = (value: string | Date) => weekdayFmt.format(toDate(value));
/** 14:30 */
export const formatTime = (value: string | Date) => timeFmt.format(toDate(value));
/** 19/10, 14:30 */
export const formatDateTime = (value: string | Date) => dateTimeFmt.format(toDate(value));
/** 2026-10-19 no fuso da clínica (útil para agrupar por dia). */
export const toClinicDay = (value: string | Date) => isoDayFmt.format(toDate(value));
/** 1.234 */
export const formatNumber = (value: number) => numberFmt.format(value);
/** 42% (recebe 0.42) */
export const formatPercent = (ratio: number) => percentFmt.format(ratio);

/**
 * Tempo relativo curto e estável ("agora", "há 5 min", "há 3 h", "ontem", "12/10").
 * Recebe a referência explicitamente para não divergir entre servidor e cliente.
 */
export function formatRelative(value: string | Date, reference: string | Date): string {
  const diffMs = toDate(reference).getTime() - toDate(value).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24 && toClinicDay(value) === toClinicDay(reference)) return `há ${hours} h`;
  const yesterday = new Date(toDate(reference).getTime() - 86_400_000);
  if (toClinicDay(value) === toClinicDay(yesterday)) return "ontem";
  return formatShortDate(value);
}

/** Iniciais para avatar: "Ana Paula Souza" → "AS". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Mascara telefone para exibição mínima: 5511987654321 → +55 11 9••••-4321. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "••••";
  const last4 = digits.slice(-4);
  const ddd = digits.length >= 12 ? digits.slice(2, 4) : digits.slice(0, 2);
  return `+55 ${ddd} 9••••-${last4}`;
}

/** Pluralização simples: plural(3, "conversa", "conversas") → "3 conversas". */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
}
