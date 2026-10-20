"use client";

import { useState } from "react";
import { Bot, CalendarSearch, ChevronLeft, ChevronRight, Siren, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { addDays, addMonths, datePart, formatDayLabel, formatLongDate, formatMonth, monthGrid, startOfMonth } from "@/lib/dates";
import { plural } from "@/lib/text";
import { appointmentStatus } from "@/services/dashboard/labels";
import type { Appointment, AppointmentStatus, Professional } from "@/services/dashboard/types";
import { DemoNotice, PageHeader } from "../page-header";
import { Segmented } from "../segmented";

type View = "lista" | "calendario";
const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function AppointmentsView({ now, appointments, professionals }: { now: string; appointments: Appointment[]; professionals: Professional[] }) {
  const today = datePart(now);
  const minDate = appointments[0]?.date ?? today;
  const maxDate = appointments.at(-1)?.date ?? today;

  const [view, setView] = useState<View>("lista");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [professional, setProfessional] = useState("todos");
  const [status, setStatus] = useState<"todos" | AppointmentStatus>("todos");
  const [month, setMonth] = useState(startOfMonth(today));
  const [day, setDay] = useState(today);

  const rangeError = from && to && from > to ? "A data inicial deve ser anterior à final." : null;
  const proName = (id: string) => professionals.find((p) => p.id === id)?.name ?? "—";

  // Filtros de profissional e status valem nas duas visões; o período, só na lista.
  const byFilters = appointments.filter((a) => (professional === "todos" || a.professionalId === professional) && (status === "todos" || a.status === status));
  const listed = rangeError ? [] : byFilters.filter((a) => (!from || a.date >= from) && (!to || a.date <= to));

  const preset = (start: string, end: string) => {
    setFrom(start);
    setTo(end);
  };
  const clear = () => {
    preset(today, today);
    setProfessional("todos");
    setStatus("todos");
  };
  const filtersActive = professional !== "todos" || status !== "todos";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agendamentos"
        description="Consultas marcadas pelo agente ou pela equipe, com filtros por data, profissional e status."
        actions={
          <Segmented
            label="Modo de exibição"
            value={view}
            onChange={setView}
            options={[
              { value: "lista", label: "Lista" },
              { value: "calendario", label: "Calendário" },
            ]}
          />
        }
      />
      <DemoNotice>
        Agenda fictícia, sem integração com o Google Agenda. Os profissionais são exemplos: o agente atual ainda não registra o profissional de cada consulta.
      </DemoNotice>

      <Card padding="sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
          {view === "lista" && (
            <>
              <Field label="De" error={rangeError}>
                {(p) => <Input {...p} type="date" min={minDate} max={maxDate} value={from} onChange={(e) => setFrom(e.target.value)} />}
              </Field>
              <Field label="Até">{(p) => <Input {...p} type="date" min={minDate} max={maxDate} value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
            </>
          )}
          <Field label="Profissional">
            {(p) => (
              <Select {...p} value={professional} onChange={(e) => setProfessional(e.target.value)}>
                <option value="todos">Todos</option>
                {professionals.map((pro) => (
                  <option key={pro.id} value={pro.id}>
                    {pro.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Status">
            {(p) => (
              <Select {...p} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="todos">Todos</option>
                {(Object.keys(appointmentStatus) as AppointmentStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {appointmentStatus[s].label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Button variant="tertiary" onClick={clear} disabled={!filtersActive && from === today && to === today}>
            Limpar filtros
          </Button>
        </div>
        {view === "lista" && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <span className="text-xs text-muted">Atalhos:</span>
            <Button variant="secondary" size="sm" onClick={() => preset(today, today)}>
              Hoje
            </Button>
            <Button variant="secondary" size="sm" onClick={() => preset(today, addDays(today, 6))}>
              Próximos 7 dias
            </Button>
            <Button variant="secondary" size="sm" onClick={() => preset(today, addDays(today, 29))}>
              Próximos 30 dias
            </Button>
            <Button variant="secondary" size="sm" onClick={() => preset(addDays(today, -7), addDays(today, -1))}>
              Últimos 7 dias
            </Button>
          </div>
        )}
      </Card>

      {view === "lista" ? (
        <AppointmentList appointments={listed} today={today} proName={proName} onClear={clear} />
      ) : (
        <CalendarView
          appointments={byFilters}
          today={today}
          month={month}
          day={day}
          minMonth={startOfMonth(minDate)}
          maxMonth={startOfMonth(maxDate)}
          onMonth={setMonth}
          onDay={setDay}
          proName={proName}
        />
      )}
    </div>
  );
}

function AppointmentList({ appointments, today, proName, onClear }: { appointments: Appointment[]; today: string; proName: (id: string) => string; onClear: () => void }) {
  if (appointments.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={CalendarSearch}
          title="Nenhuma consulta encontrada"
          description="Não há consultas para o período e os filtros escolhidos."
          action={
            <Button variant="secondary" size="sm" onClick={onClear}>
              Limpar filtros
            </Button>
          }
        />
      </Card>
    );
  }

  const days = [...new Set(appointments.map((a) => a.date))];
  const confirmed = appointments.filter((a) => a.status === "confirmada").length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted" aria-live="polite">
        {plural(appointments.length, "consulta")} · {plural(confirmed, "confirmada")}
      </p>
      {days.map((date) => {
        const items = appointments.filter((a) => a.date === date);
        return (
          <Card key={date} padding="none">
            <h2 className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3 text-sm font-semibold text-ink sm:px-5">
              <span>
                {formatDayLabel(date, today)} <span className="font-normal text-muted">· {formatLongDate(date)}</span>
              </span>
              <span className="text-xs font-normal text-muted">{plural(items.length, "consulta")}</span>
            </h2>
            <ul className="divide-y divide-line">
              {items.map((a) => (
                <AppointmentRow key={a.id} appointment={a} proName={proName} />
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

/** Linha de consulta. `compact` mantém o layout empilhado mesmo em telas largas (painel lateral). */
function AppointmentRow({ appointment: a, proName, compact = false }: { appointment: Appointment; proName: (id: string) => string; compact?: boolean }) {
  const status = appointmentStatus[a.status];
  const wide = !compact;
  return (
    <li className={cn("grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-3", wide && "sm:grid-cols-[3.5rem_minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-center sm:px-5")}>
      <span className="tabular text-sm font-semibold text-ink">{a.time}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className={cn("truncate text-sm font-medium", a.status === "cancelada" ? "text-muted line-through" : "text-ink")}>{a.patientName}</span>
          {a.emergency && (
            <Badge tone="danger" icon={<Siren />}>
              Urgência
            </Badge>
          )}
        </span>
        <span className="block truncate text-xs text-muted">{a.reason}</span>
      </span>
      <span className={cn("col-start-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft", wide && "sm:col-start-auto")}>
        <span className="truncate">{proName(a.professionalId)}</span>
        <span className="inline-flex items-center gap-1 text-muted">
          {a.origin === "agente" ? <Bot className="size-3.5" aria-hidden="true" /> : <UserRound className="size-3.5" aria-hidden="true" />}
          {a.origin === "agente" ? "Marcada pelo agente" : "Marcada pela equipe"}
        </span>
      </span>
      <span className={cn("col-start-2", wide && "sm:col-start-auto")}>
        <Badge tone={status.tone}>{status.label}</Badge>
      </span>
    </li>
  );
}

function CalendarView({
  appointments,
  today,
  month,
  day,
  minMonth,
  maxMonth,
  onMonth,
  onDay,
  proName,
}: {
  appointments: Appointment[];
  today: string;
  month: string;
  day: string;
  minMonth: string;
  maxMonth: string;
  onMonth: (month: string) => void;
  onDay: (day: string) => void;
  proName: (id: string) => string;
}) {
  const weeks = monthGrid(month);
  const countFor = (date: string) => appointments.filter((a) => a.date === date && a.status !== "cancelada").length;
  const dayItems = appointments.filter((a) => a.date === day);

  const changeMonth = (delta: number) => {
    const next = addMonths(month, delta);
    onMonth(next);
    onDay(next === startOfMonth(today) ? today : next);
  };

  return (
    <div className="grid gap-4 grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card padding="none">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-ink first-letter:uppercase" aria-live="polite">
            {formatMonth(month)}
          </h2>
          <div className="flex items-center gap-1">
            <IconButton label="Mês anterior" size="sm" variant="outline" icon={<ChevronLeft />} disabled={month <= minMonth} onClick={() => changeMonth(-1)} />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onMonth(startOfMonth(today));
                onDay(today);
              }}
            >
              Hoje
            </Button>
            <IconButton label="Próximo mês" size="sm" variant="outline" icon={<ChevronRight />} disabled={month >= maxMonth} onClick={() => changeMonth(1)} />
          </div>
        </div>
        <div className="p-2 sm:p-3">
          <div className="grid grid-cols-7 text-center text-xs font-medium text-muted" aria-hidden="true">
            {weekdays.map((w) => (
              <span key={w} className="py-2">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((date) => {
              const inMonth = date.slice(0, 7) === month.slice(0, 7);
              const count = countFor(date);
              const selected = date === day;
              return (
                <button
                  key={date}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${formatLongDate(date)}: ${count ? plural(count, "consulta") : "sem consultas"}`}
                  onClick={() => onDay(date)}
                  className={cn(
                    "flex min-h-14 flex-col items-start rounded-md border p-1.5 text-left transition-colors focus-ring sm:min-h-20 sm:p-2",
                    selected ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong hover:bg-canvas",
                    !inMonth && !selected && "bg-canvas",
                  )}
                >
                  <span
                    className={cn(
                      "tabular flex size-6 items-center justify-center rounded-full text-xs font-medium",
                      date === today ? "bg-navy text-white" : inMonth ? "text-ink" : "text-muted",
                    )}
                  >
                    {Number(date.slice(8))}
                  </span>
                  {count > 0 && (
                    <span className={cn("mt-auto text-[0.6875rem] font-medium", selected ? "text-brand" : "text-ink-soft")}>
                      <span className="tabular">{count}</span>
                      <span className="hidden sm:inline"> {count === 1 ? "consulta" : "consultas"}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 px-1 text-xs text-muted">Contagem sem as consultas canceladas. Domingos sem atendimento.</p>
        </div>
      </Card>

      <Card padding="none">
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink first-letter:uppercase sm:px-5">
          {formatLongDate(day)} <span className="font-normal text-muted">· {plural(dayItems.length, "consulta")}</span>
        </h2>
        {dayItems.length === 0 ? (
          <EmptyState icon={CalendarSearch} title="Sem consultas neste dia" description="Escolha outro dia no calendário ou ajuste os filtros." />
        ) : (
          <ul tabIndex={0} aria-label="Consultas do dia selecionado" className="max-h-[32rem] divide-y divide-line overflow-y-auto focus-visible:outline-offset-[-2px]">
            {dayItems.map((a) => (
              <AppointmentRow key={a.id} appointment={a} proName={proName} compact />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
