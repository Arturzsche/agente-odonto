import type {
  Appointment,
  AppointmentCategory,
  ConversationStatus,
  DailyPoint,
  Kpi,
  Notification,
  PeriodKey,
  StatusSlice,
  WithMeta,
} from "@/types/domain";
import { toClinicDay } from "@/lib/format";
import { PERIOD_DAYS, type DataSource } from "../types";
import { getDemoDataset, isOpenAt, type DemoDataset } from "./dataset";

/** Simula a latência de uma API real só o suficiente para os estados de carregamento serem visíveis. */
const LATENCY_MS = Number(process.env.DEMO_LATENCY_MS ?? 120);
const wait = () => (LATENCY_MS > 0 ? new Promise((r) => setTimeout(r, LATENCY_MS)) : Promise.resolve());

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

async function withMeta<T>(build: (ds: DemoDataset) => T): Promise<WithMeta<T>> {
  await wait();
  const ds = getDemoDataset();
  return { data: build(ds), meta: { source: "demo", generatedAt: ds.referenceAt } };
}

function sliceDaily(ds: DemoDataset, period: PeriodKey, offsetPeriods = 0): DailyPoint[] {
  const days = PERIOD_DAYS[period];
  const end = ds.daily.length - days * offsetPeriods;
  return ds.daily.slice(Math.max(0, end - days), end);
}

const sum = (points: DailyPoint[], key: keyof Omit<DailyPoint, "day">) => points.reduce((s, p) => s + p[key], 0);

function statusBreakdown(ds: DemoDataset, points: DailyPoint[]): StatusSlice[] {
  const total = sum(points, "conversations");
  const waiting = ds.conversations.filter((c) => c.status === "aguardando_equipe").length;
  const human = Math.max(ds.conversations.filter((c) => c.status === "em_atendimento_humano").length, Math.round(sum(points, "escalated") * 0.6));
  const agent = ds.conversations.filter((c) => c.status === "agente").length;
  return [
    { status: "encerrada", count: Math.max(0, total - waiting - human - agent) },
    { status: "agente", count: agent },
    { status: "em_atendimento_humano", count: human },
    { status: "aguardando_equipe", count: waiting },
  ] satisfies StatusSlice[];
}

function kpis(ds: DemoDataset, period: PeriodKey): Kpi[] {
  const current = sliceDaily(ds, period);
  const previous = sliceDaily(ds, period, 1);
  return [
    {
      id: "conversas_recebidas",
      label: "Conversas recebidas",
      value: sum(current, "conversations"),
      previousValue: sum(previous, "conversations"),
      definition: "Atendimentos iniciados por pacientes no período, em qualquer horário.",
    },
    {
      id: "aguardando_equipe",
      label: "Aguardando a equipe",
      value: ds.conversations.filter((c) => c.status === "aguardando_equipe").length,
      previousValue: null,
      definition: "Conversas que precisam de uma pessoa e ainda não foram assumidas. Valor atual, não do período.",
    },
    {
      id: "agendamentos_confirmados",
      label: "Agendamentos confirmados",
      value: sum(current, "appointments"),
      previousValue: sum(previous, "appointments"),
      definition: "Consultas marcadas no período, pelo agente ou pela equipe, que não foram canceladas.",
    },
    {
      id: "intervencao_humana",
      label: "Precisaram da equipe",
      value: sum(current, "escalated"),
      previousValue: sum(previous, "escalated"),
      definition: "Conversas encaminhadas para uma pessoa no período (urgências, dúvidas fora da base de conhecimento ou pedido do paciente).",
    },
  ];
}

function appointmentsInPeriod(ds: DemoDataset, period: PeriodKey): Appointment[] {
  const from = new Date(new Date(ds.referenceAt).getTime() - PERIOD_DAYS[period] * 86_400_000).toISOString();
  return ds.appointments.filter((a) => a.startsAt >= from && a.startsAt <= ds.referenceAt);
}

const ATTENTION: ConversationStatus[] = ["aguardando_equipe", "em_atendimento_humano"];

export const demoDataSource: DataSource = {
  kind: "demo",

  getOverview: (period) =>
    withMeta((ds) => {
      const daily = sliceDaily(ds, period);
      return {
        period,
        kpis: kpis(ds, period),
        daily,
        statusBreakdown: statusBreakdown(ds, daily),
        upcomingAppointments: ds.appointments
          .filter((a) => a.startsAt >= ds.referenceAt && (a.status === "agendado" || a.status === "confirmado"))
          .slice(0, 6),
        attentionConversations: ds.conversations
          .filter((c) => ATTENTION.includes(c.status))
          .sort((a, b) => (a.priority === b.priority ? b.lastMessageAt.localeCompare(a.lastMessageAt) : a.priority === "alta" ? -1 : 1))
          .slice(0, 5)
          .map(({ messages: _messages, ...summary }) => summary),
      };
    }),

  listConversations: (filters = {}) =>
    withMeta((ds) => {
      const q = filters.q ? normalize(filters.q) : "";
      return ds.conversations
        .filter((c) => !filters.status || filters.status === "todas" || c.status === filters.status)
        .filter((c) => !filters.priority || filters.priority === "todas" || c.priority === filters.priority)
        .filter((c) => !q || normalize(c.patient.name).includes(q) || normalize(c.lastMessagePreview).includes(q) || c.messages.some((m) => normalize(m.text).includes(q)))
        .map(({ messages: _messages, ...summary }) => summary);
    }),

  getConversation: (id) => withMeta((ds) => ds.conversations.find((c) => c.id === id) ?? null),

  listAppointments: (filters = {}) =>
    withMeta((ds) => {
      const q = filters.q ? normalize(filters.q) : "";
      return ds.appointments
        .filter((a) => !filters.from || toClinicDay(a.startsAt) >= filters.from)
        .filter((a) => !filters.to || toClinicDay(a.startsAt) <= filters.to)
        .filter((a) => !filters.status || filters.status === "todos" || a.status === filters.status)
        .filter((a) => !filters.professionalId || filters.professionalId === "todos" || a.professional?.id === filters.professionalId)
        .filter((a) => !q || normalize(a.patient.name).includes(q) || normalize(a.reason).includes(q) || normalize(a.category).includes(q));
    }),

  listProfessionals: () => withMeta((ds) => ds.professionals),

  listPatients: (filters = {}) =>
    withMeta((ds) => {
      const q = filters.q ? normalize(filters.q) : "";
      const digits = (filters.q ?? "").replace(/\D/g, "");
      return ds.patients.filter((p) => !q || normalize(p.name).includes(q) || (digits.length >= 2 && p.phoneMasked.replace(/\D/g, "").includes(digits)));
    }),

  listKnowledge: () => withMeta((ds) => ds.knowledge),

  getReports: (period) =>
    withMeta((ds) => {
      const daily = sliceDaily(ds, period);
      const total = sum(daily, "conversations");
      const weightSum = ds.byHourWeights.reduce((s, w) => s + w, 0);
      const byHour = ds.byHourWeights.map((w, hour) => ({ hour, conversations: Math.round((total * w) / weightSum) }));
      // Fora do expediente considerando um dia útil típico (segunda-feira)
      const afterHours = byHour.filter((h) => !isOpenAt(1, h.hour)).reduce((s, h) => s + h.conversations, 0);
      const appts = appointmentsInPeriod(ds, period);
      const categories = new Map<AppointmentCategory, number>();
      for (const a of appts) categories.set(a.category, (categories.get(a.category) ?? 0) + 1);
      return {
        period,
        daily,
        statusBreakdown: statusBreakdown(ds, daily),
        byHour,
        afterHoursShare: total ? afterHours / total : 0,
        appointmentsByCategory: [...categories.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
        appointmentsBySource: (["agente", "equipe"] as const).map((source) => ({ source, count: appts.filter((a) => a.source === source).length })),
      };
    }),

  getIntegrations: () => withMeta((ds) => ds.integrations),

  getClinicSettings: () => withMeta((ds) => ds.clinic),

  listTeam: () => withMeta((ds) => ds.team),

  listNotifications: () =>
    withMeta((ds) => {
      const fromConversations: Notification[] = ds.conversations
        .filter((c) => c.status === "aguardando_equipe")
        .map((c) => ({
          id: `n-${c.id}`,
          title: c.priority === "alta" ? `Prioridade: ${c.patient.name}` : `${c.patient.name} aguarda a equipe`,
          description: c.priorityReason ?? c.lastMessagePreview,
          createdAt: c.lastMessageAt,
          href: `/dashboard/conversas?id=${c.id}`,
          read: false,
        }));
      const emergencies: Notification[] = ds.appointments
        .filter((a) => a.isEmergency && a.startsAt >= ds.referenceAt && a.status !== "cancelado")
        .slice(0, 2)
        .map((a) => ({
          id: `n-${a.id}`,
          title: "Consulta de urgência agendada",
          description: `${a.patient.name} · ${a.reason}`,
          // Momento em que a consulta foi marcada (algumas horas atrás), não a data da consulta.
          createdAt: new Date(new Date(ds.referenceAt).getTime() - (3 + Number(a.id.replace(/\D/g, "")) % 20) * 3_600_000).toISOString(),
          href: `/dashboard/agendamentos?q=${encodeURIComponent(a.patient.name)}`,
          read: true,
        }));
      return [...fromConversations, ...emergencies];
    }),
};
