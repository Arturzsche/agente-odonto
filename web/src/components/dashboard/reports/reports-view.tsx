"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { formatDayMonth, formatLongDate, formatShortDate } from "@/lib/dates";
import { contactReason } from "@/services/dashboard/labels";
import type { ContactReason, DailyStats } from "@/services/dashboard/types";
import { BarList, ChartTable, ColumnChart, Legend, type ColumnDatum, type Series } from "../charts";
import { DemoNotice, PageHeader, StatCard } from "../page-header";
import { Segmented } from "../segmented";

type Period = "7" | "30" | "90";
type Grouping = "dia" | "semana";

const resolution: Series[] = [
  { key: "resolvedByAgent", label: "Resolvidas pelo agente", color: 1 },
  { key: "handedOff", label: "Encaminhadas à equipe", color: 2 },
];
const single = (label: string): Series[] => [{ key: "value", label, color: 1 }];
const fmt = (n: number) => n.toLocaleString("pt-BR");
const pct = (part: number, total: number) => (total ? `${Math.round((part / total) * 100)}%` : "—");

/** Agrupa dias consecutivos em semanas (blocos de 7 dias contados a partir do fim do período). */
function group(days: DailyStats[], by: Grouping) {
  if (by === "dia") return days.map((d) => ({ start: d.date, end: d.date, days: [d] }));
  const groups: Array<{ start: string; end: string; days: DailyStats[] }> = [];
  for (let end = days.length; end > 0; end -= 7) {
    const chunk = days.slice(Math.max(0, end - 7), end);
    groups.unshift({ start: chunk[0].date, end: chunk[chunk.length - 1].date, days: chunk });
  }
  return groups;
}

const total = (days: DailyStats[], key: "conversations" | "resolvedByAgent" | "handedOff" | "appointmentsCreated") => days.reduce((sum, d) => sum + d[key], 0);

export function ReportsView({ stats }: { stats: DailyStats[] }) {
  const [period, setPeriod] = useState<Period>("30");
  const [grouping, setGrouping] = useState<Grouping>("dia");
  const days = stats.slice(-Number(period));
  // 90 dias por dia ficam ilegíveis: agrupa por semana automaticamente.
  const by: Grouping = period === "90" ? "semana" : grouping;
  const groups = group(days, by);

  const label = (g: { start: string; end: string }) => (by === "dia" ? formatShortDate(g.start) : formatDayMonth(g.start));
  const fullLabel = (g: { start: string; end: string }) => (by === "dia" ? formatLongDate(g.start) : `Semana de ${formatDayMonth(g.start)} a ${formatDayMonth(g.end)}`);

  const resolutionData: ColumnDatum[] = groups.map((g) => ({ label: label(g), fullLabel: fullLabel(g), values: { resolvedByAgent: total(g.days, "resolvedByAgent"), handedOff: total(g.days, "handedOff") } }));
  const bookingData: ColumnDatum[] = groups.map((g) => ({ label: label(g), fullLabel: fullLabel(g), values: { value: total(g.days, "appointmentsCreated") } }));

  const reasons = (Object.keys(contactReason) as ContactReason[])
    .map((r) => ({ key: r, label: contactReason[r], value: days.reduce((sum, d) => sum + d.reasons[r], 0) }))
    .sort((a, b) => b.value - a.value);

  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 7h às 22h
  const hourData: ColumnDatum[] = hours.map((h) => ({ label: `${h}h`, fullLabel: `Das ${h}h às ${h + 1}h`, values: { value: days.reduce((sum, d) => sum + d.byHour[h], 0) } }));
  const outside = days.reduce((sum, d) => sum + d.byHour.filter((_, h) => h < 8 || h >= 18).reduce((a, b) => a + b, 0), 0);

  const conversations = total(days, "conversations");
  const resolved = total(days, "resolvedByAgent");
  const handedOff = total(days, "handedOff");
  const booked = total(days, "appointmentsCreated");

  const exportCsv = () => {
    const header = ["data", "conversas", "resolvidas_pelo_agente", "encaminhadas_a_equipe", "agendamentos_criados", ...Object.keys(contactReason).map((r) => `motivo_${r}`)];
    const lines = days.map((d) => [d.date, d.conversations, d.resolvedByAgent, d.handedOff, d.appointmentsCreated, ...(Object.keys(contactReason) as ContactReason[]).map((r) => d.reasons[r])].join(";"));
    const blob = new Blob([`﻿# Dados demonstrativos (fictícios)\n${header.join(";")}\n${lines.join("\n")}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `odontoagent-relatorio-demonstrativo-${days[0].date}-a-${days.at(-1)?.date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Indicadores do atendimento por período: volume, resolução, motivos de contato e horários de maior procura."
        actions={
          <Button variant="secondary" icon={<Download />} onClick={exportCsv}>
            Exportar CSV
          </Button>
        }
      />
      <DemoNotice>Indicadores calculados sobre dados fictícios. O arquivo exportado também é demonstrativo e vem identificado como tal.</DemoNotice>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Período"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "7", label: "7 dias" },
            { value: "30", label: "30 dias" },
            { value: "90", label: "90 dias" },
          ]}
        />
        <Segmented
          label="Agrupar por"
          value={by}
          onChange={setGrouping}
          options={
            period === "90"
              ? [{ value: "semana", label: "Por semana" }]
              : [
                  { value: "dia", label: "Por dia" },
                  { value: "semana", label: "Por semana" },
                ]
          }
        />
        <p className="text-xs text-muted">
          {formatLongDate(days[0].date)} a {formatLongDate(days[days.length - 1].date)}
        </p>
      </div>

      <section aria-label="Indicadores do período" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Conversas" value={fmt(conversations)} hint={`Média de ${fmt(Math.round(conversations / days.length))} por dia`} />
        <StatCard label="Resolvidas pelo agente" value={pct(resolved, conversations)} hint={`${fmt(resolved)} conversas sem precisar da equipe`} />
        <StatCard label="Encaminhadas à equipe" value={fmt(handedOff)} hint={`${pct(handedOff, conversations)} das conversas`} />
        <StatCard label="Agendamentos pelo agente" value={fmt(booked)} hint={`${pct(booked, conversations)} das conversas viraram consulta`} />
      </section>

      <Card>
        <CardHeader as="h2" title="Conversas por forma de resolução" description={by === "dia" ? "Por dia" : "Por semana (7 dias)"} />
        <div className="mt-4">
          <Legend series={resolution} values={{ resolvedByAgent: fmt(resolved), handedOff: fmt(handedOff) }} />
        </div>
        <div className="mt-7">
          <ColumnChart data={resolutionData} series={resolution} unit="conversas" height={220} />
        </div>
        <ChartTable
          caption="Conversas por forma de resolução"
          columns={[by === "dia" ? "Dia" : "Semana", "Resolvidas pelo agente", "Encaminhadas à equipe", "Total"]}
          rows={resolutionData.map((d) => [d.fullLabel ?? d.label, d.values.resolvedByAgent, d.values.handedOff, d.values.resolvedByAgent + d.values.handedOff])}
        />
      </Card>

      <div className="grid gap-4 grid-cols-[minmax(0,1fr)] xl:grid-cols-2">
        <Card>
          <CardHeader as="h2" title="Motivos de contato" description="Classificação da primeira mensagem de cada conversa" />
          <div className="mt-5">
            <BarList items={reasons} />
          </div>
          <ChartTable caption="Motivos de contato" columns={["Motivo", "Conversas", "Participação"]} rows={reasons.map((r) => [r.label, r.value, pct(r.value, conversations)])} />
        </Card>

        <Card>
          <CardHeader as="h2" title="Horários de maior procura" description={`Conversas iniciadas por hora · ${pct(outside, conversations)} fora do horário de atendimento (8h–18h)`} />
          <div className="mt-7">
            <ColumnChart data={hourData} series={single("Conversas iniciadas")} unit="conversas" />
          </div>
          <ChartTable caption="Conversas iniciadas por hora do dia" columns={["Hora", "Conversas"]} rows={hourData.map((d) => [d.fullLabel ?? d.label, d.values.value])} />
        </Card>
      </div>

      <Card>
        <CardHeader as="h2" title="Agendamentos criados pelo agente" description="Consultas marcadas diretamente na conversa, sem intervenção da equipe" />
        <div className="mt-7">
          <ColumnChart data={bookingData} series={single("Agendamentos")} unit="agendamentos" />
        </div>
        <ChartTable caption="Agendamentos criados pelo agente" columns={[by === "dia" ? "Dia" : "Semana", "Agendamentos"]} rows={bookingData.map((d) => [d.fullLabel ?? d.label, d.values.value])} />
      </Card>
    </div>
  );
}
