"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarCheck, Clock3, Headset, MessagesSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { addDays, datePart, formatDayLabel, formatLongDate, formatRelative, formatShortDate } from "@/lib/dates";
import { plural } from "@/lib/text";
import { appointmentStatus, conversationStatus } from "@/services/dashboard/labels";
import type { Appointment, Conversation, ConversationStatus, DailyStats, Professional } from "@/services/dashboard/types";
import { ChartTable, ColumnChart, Legend, ProportionBar, type ChartColor, type Series } from "../charts";
import { DemoNotice, PageHeader, StatCard } from "../page-header";
import { Segmented } from "../segmented";

const periods = [
  { value: "7", label: "7 dias" },
  { value: "14", label: "14 dias" },
  { value: "30", label: "30 dias" },
] as const;
type Period = (typeof periods)[number]["value"];

const series: Series[] = [
  { key: "resolvedByAgent", label: "Resolvidas pelo agente", color: 1 },
  { key: "handedOff", label: "Encaminhadas à equipe", color: 2 },
];

const statusColors: Record<ConversationStatus, ChartColor> = { agente: 1, aguardando: 2, equipe: 3, encerrada: 4 };

const sum = (days: DailyStats[], key: "conversations" | "handedOff" | "resolvedByAgent") => days.reduce((total, d) => total + d[key], 0);

function compare(current: number, previous: number) {
  if (!previous) return "Sem dados do período anterior";
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return "Igual ao período anterior";
  return `${change > 0 ? "+" : ""}${change}% em relação ao período anterior`;
}

export function OverviewView({ now, stats, conversations, appointments, professionals }: { now: string; stats: DailyStats[]; conversations: Conversation[]; appointments: Appointment[]; professionals: Professional[] }) {
  const [period, setPeriod] = useState<Period>("14");
  const days = Number(period);
  const today = datePart(now);
  const current = stats.slice(-days);
  const previous = stats.slice(-days * 2, -days);

  const waiting = conversations.filter((c) => c.status === "aguardando").sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.lastMessageAt.localeCompare(b.lastMessageAt));
  const weekEnd = addDays(today, 7);
  const confirmed = appointments.filter((a) => a.status === "confirmada" && a.date >= today && a.date < weekEnd);
  const upcoming = appointments.filter((a) => `${a.date}T${a.time}` >= now && a.status !== "cancelada").slice(0, 8);
  const proName = (id: string) => professionals.find((p) => p.id === id)?.name ?? "—";

  const received = sum(current, "conversations");
  const handedOff = sum(current, "handedOff");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral"
        description={`Resumo do atendimento · ${formatLongDate(today)}`}
        actions={<Segmented label="Período" options={[...periods]} value={period} onChange={setPeriod} />}
      />
      <DemoNotice>Todos os números, nomes e conversas desta tela são fictícios e servem para demonstrar o painel. Nenhum dado vem do agente em operação.</DemoNotice>

      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Conversas recebidas" value={received.toLocaleString("pt-BR")} hint={compare(received, sum(previous, "conversations"))} icon={<MessagesSquare />} />
        <StatCard
          label="Aguardando atendimento"
          value={String(waiting.length)}
          hint={waiting.some((c) => c.urgent) ? `${plural(waiting.filter((c) => c.urgent).length, "com prioridade", "com prioridade")} · agora` : "Agora, sem prioridades"}
          icon={<Clock3 />}
          tone={waiting.length ? "warning" : "neutral"}
        />
        <StatCard label="Agendamentos confirmados" value={String(confirmed.length)} hint="Nos próximos 7 dias" icon={<CalendarCheck />} />
        <StatCard
          label="Pedidos de atendimento humano"
          value={handedOff.toLocaleString("pt-BR")}
          hint={`${received ? Math.round((handedOff / received) * 100) : 0}% das conversas do período`}
          icon={<Headset />}
        />
      </section>

      <div className="grid gap-4 grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader as="h2" title="Conversas por dia" description={`Últimos ${days} dias, por forma de resolução`} />
          <div className="mt-4">
            <Legend series={series} values={{ resolvedByAgent: sum(current, "resolvedByAgent").toLocaleString("pt-BR"), handedOff: handedOff.toLocaleString("pt-BR") }} />
          </div>
          <div className="mt-7">
            <ColumnChart
              height={240}
              unit="conversas"
              series={series}
              data={current.map((d) => ({ label: formatShortDate(d.date), fullLabel: formatLongDate(d.date), values: { resolvedByAgent: d.resolvedByAgent, handedOff: d.handedOff } }))}
            />
          </div>
          <ChartTable
            caption={`Conversas por dia nos últimos ${days} dias`}
            columns={["Dia", "Resolvidas pelo agente", "Encaminhadas à equipe", "Total"]}
            rows={current.map((d) => [formatShortDate(d.date), d.resolvedByAgent, d.handedOff, d.conversations])}
          />
        </Card>

        <Card>
          <CardHeader as="h2" title="Status das conversas" description={`${plural(conversations.length, "conversa recente", "conversas recentes")} (hoje e ontem)`} />
          <div className="mt-5">
            <ProportionBar
              items={(Object.keys(conversationStatus) as ConversationStatus[]).map((status) => ({
                key: status,
                label: conversationStatus[status].label,
                value: conversations.filter((c) => c.status === status).length,
                color: statusColors[status],
              }))}
            />
          </div>
          <div className="mt-6 border-t border-line pt-4">
            <p className="text-sm font-medium text-ink">Precisam de atenção</p>
            {waiting.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nenhuma conversa aguardando a equipe.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {waiting.slice(0, 4).map((c) => (
                  <li key={c.id}>
                    <Link href={`/dashboard/conversas?c=${c.id}`} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-canvas focus-ring">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{c.patientName}</span>
                        <span className="block truncate text-xs text-muted">{c.handoffReason}</span>
                      </span>
                      {c.urgent && <Badge tone="danger">Prioridade</Badge>}
                      <span className="tabular text-xs text-muted">{formatRelative(c.lastMessageAt, now)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card padding="none">
        <CardHeader
          as="h2"
          title="Próximos agendamentos"
          description="As próximas consultas da agenda"
          className="px-5 pt-5 sm:px-6"
          actions={
            <ButtonLink href="/dashboard/agendamentos" variant="secondary" size="sm" iconEnd={<ArrowRight />}>
              Ver agenda
            </ButtonLink>
          }
        />
        {upcoming.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="Nenhuma consulta futura" description="Quando houver consultas marcadas, elas aparecem aqui." />
        ) : (
          <div className="relative mt-4 overflow-x-auto focus-ring" tabIndex={0} role="region" aria-label="Tabela de próximos agendamentos">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">Próximos agendamentos</caption>
              <thead className="border-y border-line bg-canvas text-xs text-muted">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium sm:px-6">Paciente</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Quando</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Profissional</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Motivo</th>
                  <th scope="col" className="px-5 py-2.5 font-medium sm:px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {upcoming.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-3 font-medium text-ink sm:px-6">{a.patientName}</td>
                    <td className="tabular px-3 py-3 text-ink-soft">
                      {formatDayLabel(a.date, today)} · {a.time}
                    </td>
                    <td className="px-3 py-3 text-ink-soft">{proName(a.professionalId)}</td>
                    <td className="px-3 py-3 text-ink-soft">{a.reason}</td>
                    <td className="px-5 py-3 sm:px-6">
                      <Badge tone={appointmentStatus[a.status].tone}>{appointmentStatus[a.status].label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
