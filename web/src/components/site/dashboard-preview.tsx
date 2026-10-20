import type { ReactNode } from "react";
import { ArrowRight, Bell, BookOpenText, CalendarDays, ChartColumnBig, LayoutDashboard, MessagesSquare, PlugZap, Search, Settings, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { demoRequestHref, sectionIds } from "@/config/site";
import { cn } from "@/lib/cn";
import { Section, SectionHeading } from "./section";

/* ------------------------------------------------------------------ Dados fictícios */

const nav = [
  { icon: LayoutDashboard, label: "Visão geral", active: true },
  { icon: MessagesSquare, label: "Conversas", count: 3 },
  { icon: CalendarDays, label: "Agendamentos" },
  { icon: Users, label: "Pacientes" },
  { icon: BookOpenText, label: "Base de conhecimento" },
  { icon: ChartColumnBig, label: "Relatórios" },
  { icon: PlugZap, label: "Integrações" },
  { icon: Settings, label: "Configurações" },
];

const kpis = [
  { label: "Conversas recebidas", value: "128", note: "últimos 7 dias" },
  { label: "Aguardando a equipe", value: "3", note: "agora" },
  { label: "Agendamentos confirmados", value: "41", note: "últimos 7 dias" },
  { label: "Precisaram da equipe", value: "9", note: "últimos 7 dias" },
];

/** Conversas por dia (seg → dom) e quantas foram para a equipe. */
const volume = [
  { day: "Seg", total: 24, team: 2 },
  { day: "Ter", total: 21, team: 1 },
  { day: "Qua", total: 19, team: 2 },
  { day: "Qui", total: 22, team: 1 },
  { day: "Sex", total: 18, team: 2 },
  { day: "Sáb", total: 15, team: 1 },
  { day: "Dom", total: 9, team: 0 },
];

const conversations: Array<{ name: string; text: string; time: string; status: string; tone: BadgeTone; urgent?: boolean }> = [
  { name: "Lucas Martins", text: "Estou com dor no dente desde ontem…", time: "agora", status: "Aguardando equipe", tone: "warning", urgent: true },
  { name: "Camila Rocha", text: "Perfeito, quinta às 9h então.", time: "12 min", status: "Com o agente", tone: "brand" },
  { name: "Rafaela Lima", text: "Vocês aceitam convênio?", time: "35 min", status: "Aguardando equipe", tone: "warning" },
  { name: "Bruno Teixeira", text: "Obrigado, até sábado!", time: "1 h", status: "Encerrada", tone: "neutral" },
];

const appointments: Array<{ time: string; name: string; type: string; status: string; tone: BadgeTone }> = [
  { time: "09:00", name: "Camila Rocha", type: "Avaliação inicial", status: "Confirmado", tone: "success" },
  { time: "10:30", name: "João Freitas", type: "Retorno", status: "Agendado", tone: "brand" },
  { time: "14:00", name: "Marina Duarte", type: "Limpeza", status: "Confirmado", tone: "success" },
];

/* ------------------------------------------------------------------ Componentes */

function VolumeChart() {
  const max = Math.max(...volume.map((d) => d.total));
  const total = volume.reduce((sum, d) => sum + d.total, 0);
  const team = volume.reduce((sum, d) => sum + d.team, 0);
  return (
    <figure className="rounded-lg border border-line bg-surface p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[0.8125rem] font-semibold text-ink">Volume de conversas</span>
        <span className="flex items-center gap-3 text-[0.6875rem] text-muted">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-xs bg-brand" /> Conversas
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-xs bg-warning" /> Para a equipe
          </span>
        </span>
      </figcaption>
      <p className="sr-only">
        Gráfico de exemplo: {total} conversas na semana, {team} encaminhadas para a equipe.
      </p>
      <div aria-hidden="true" className="mt-4 flex items-end gap-2 sm:gap-3">
        {volume.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-44 w-full items-end justify-center gap-0.5 border-b border-line">
              <span className="w-full max-w-5 rounded-t-xs bg-brand" style={{ height: `${(d.total / max) * 100}%` }} />
              <span className="w-full max-w-2 rounded-t-xs bg-warning" style={{ height: `${(Math.max(d.team, 0.4) / max) * 100}%` }} />
            </div>
            <span className="text-[0.6875rem] text-muted">{d.day}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

function PanelBox({ title, link, children }: { title: string; link: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="text-[0.8125rem] font-semibold text-ink">{title}</span>
        <span className="text-[0.6875rem] font-medium text-brand">{link}</span>
      </div>
      {children}
    </div>
  );
}

function AppWindow() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
      <div className="flex">
        {/* Navegação lateral */}
        <div className="hidden w-56 shrink-0 border-r border-line p-3 lg:block">
          <div className="flex h-9 items-center px-2">
            <Logo size="sm" />
          </div>
          <ul className="mt-4 space-y-0.5">
            {nav.map(({ icon: Icon, label, active, count }) => (
              <li
                key={label}
                className={cn("flex h-8 items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 text-[0.8125rem]", active ? "bg-brand-soft font-medium text-brand" : "text-ink-soft")}
              >
                <Icon className={cn("size-4", active ? "text-brand" : "text-faint")} aria-hidden="true" />
                {label}
                {count && <span className="tabular ml-auto rounded-full bg-warning-soft px-1.5 text-[0.625rem] font-semibold text-warning">{count}</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 flex-1 bg-canvas">
          {/* Cabeçalho */}
          <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-5">
            <span className="text-[0.8125rem] font-medium text-ink">Clínica Exemplo</span>
            <span className="text-faint" aria-hidden="true">
              /
            </span>
            <span className="text-[0.8125rem] text-muted">Visão geral</span>
            <span className="ml-auto hidden items-center gap-2 rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs text-muted sm:flex">
              <Search className="size-3.5" aria-hidden="true" /> Buscar pacientes e conversas
            </span>
            <Bell className="ml-auto size-4 text-muted sm:ml-0" aria-hidden="true" />
            <Avatar name="Marina Costa" size="xs" />
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {kpis.map((k) => (
                <li key={k.label} className="rounded-lg border border-line bg-surface p-3.5">
                  <p className="text-[0.6875rem] font-medium text-muted">{k.label}</p>
                  <p className="tabular mt-1.5 text-xl font-semibold tracking-tight text-navy">{k.value}</p>
                  <p className="text-[0.6875rem] text-muted">{k.note}</p>
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <VolumeChart />
              <PanelBox title="Conversas recentes" link="Ver todas">
                <ul className="divide-y divide-line">
                  {conversations.map((c) => (
                    <li key={c.name} className="flex items-center gap-3 px-4 py-2.5">
                      <Avatar name={c.name} size="xs" />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink">
                          {c.name}
                          {c.urgent && <span className="rounded-xs bg-danger-soft px-1 text-[0.625rem] font-semibold text-danger">Prioridade</span>}
                        </p>
                        <p className="truncate text-xs text-muted">{c.text}</p>
                      </div>
                      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                        <span className="text-[0.6875rem] text-muted">{c.time}</span>
                        <Badge tone={c.tone} className="h-5 text-[0.6875rem]">
                          {c.status}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </PanelBox>
            </div>

            <PanelBox title="Agendamentos de hoje" link="Abrir agenda">
              <table className="w-full text-left text-[0.8125rem]">
                <caption className="sr-only">Agendamentos de exemplo</caption>
                <thead className="text-[0.6875rem] text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Horário
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Paciente
                    </th>
                    <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">
                      Procedimento
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line border-t border-line">
                  {appointments.map((a) => (
                    <tr key={a.time}>
                      <td className="tabular px-4 py-2.5 text-ink">{a.time}</td>
                      <td className="px-4 py-2.5 font-medium text-ink">{a.name}</td>
                      <td className="hidden px-4 py-2.5 text-muted sm:table-cell">{a.type}</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={a.tone} dot className="h-5 text-[0.6875rem]">
                          {a.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PanelBox>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardPreview() {
  return (
    <Section id={sectionIds.dashboard} labelledBy="dashboard-titulo">
      <SectionHeading
        id="dashboard-titulo"
        eyebrow="Painel"
        title="Tudo o que acontece no atendimento, em um só lugar."
        description="Acompanhe conversas, organize agendamentos e visualize a operação da sua clínica com mais clareza."
      />
      <figure className="mt-14 lg:mt-16">
        <AppWindow />
        <figcaption className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
          <Badge tone="warning">Dados fictícios</Badge>
          Prévia com pacientes e números inventados, apenas para ilustrar o painel.
        </figcaption>
      </figure>
      <div className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-title font-semibold text-navy">Conheça o OdontoAgent por dentro.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/dashboard" variant="secondary" iconEnd={<ArrowRight />}>
            Explorar o painel
          </ButtonLink>
          <ButtonLink href={demoRequestHref}>Agendar demonstração</ButtonLink>
        </div>
      </div>
    </Section>
  );
}
