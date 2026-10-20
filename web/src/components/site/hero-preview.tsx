import { CalendarCheck2, Check, Mic, Paperclip } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

/** Conversa fictícia usada apenas como ilustração do produto. */
const messages = [
  { from: "paciente", text: "Oi! Vocês têm horário para avaliação esta semana?", time: "19:42" },
  { from: "agente", text: "Oi, Ana! Temos, sim. Você prefere de manhã ou à tarde?", time: "19:42" },
  { from: "paciente", text: "De manhã, se possível.", time: "19:43" },
  { from: "agente", text: "Quinta às 9h ou sexta às 10h30. Qual fica melhor para você?", time: "19:43" },
  { from: "paciente", text: "Quinta às 9h.", time: "19:44" },
] as const;

const summary = [
  ["Intenção", "Agendamento"],
  ["Preferência", "Manhã"],
  ["Procedimento", "Avaliação inicial"],
] as const;

/**
 * Prévia do produto no hero: janela de conversa, resumo do atendimento e
 * confirmação de agendamento. Interface real em miniatura, com dados fictícios.
 */
export function HeroPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-xl lg:max-w-none">
      {/* Grade técnica discreta atrás da janela (decorativa) */}
      <div
        aria-hidden="true"
        className="absolute -inset-x-6 -inset-y-8 -z-10 [background-image:linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)] opacity-60"
      />

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
        {/* Barra superior da janela */}
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar name="Ana Souza" size="sm" />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-ink">Ana Souza</p>
              <p className="text-xs text-muted">WhatsApp · paciente fictícia</p>
            </div>
          </div>
          <Badge tone="brand" dot>
            Com o agente
          </Badge>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_11.5rem]">
          {/* Mensagens */}
          <ol aria-label="Conversa de exemplo" className="space-y-2.5 bg-canvas px-4 py-5">
            {messages.map((m, i) => {
              const agent = m.from === "agente";
              return (
                <li
                  key={i}
                  className={cn("flex motion-safe:animate-enter", agent ? "justify-end" : "justify-start")}
                  style={{ animationDelay: `${150 + i * 120}ms` }}
                >
                  <div
                    className={cn(
                      "max-w-[82%] rounded-lg px-3 py-2 text-[0.8125rem] leading-snug shadow-xs",
                      agent ? "rounded-tr-xs bg-brand-soft text-ink ring-1 ring-brand-ring" : "rounded-tl-xs border border-line bg-surface text-ink",
                    )}
                  >
                    <span className="sr-only">{agent ? "OdontoAgent" : "Paciente"}: </span>
                    {m.text}
                    <span className={cn("tabular mt-1 block text-right text-[0.6875rem]", agent ? "text-ink-soft" : "text-muted")}>{m.time}</span>
                  </div>
                </li>
              );
            })}
            <li className="flex justify-center pt-1 motion-safe:animate-enter" style={{ animationDelay: "800ms" }}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[0.6875rem] font-medium text-muted ring-1 ring-line">
                <CalendarCheck2 className="size-3.5 text-success" aria-hidden="true" />
                Agenda consultada · horário reservado
              </span>
            </li>
          </ol>

          {/* Resumo do atendimento */}
          <aside aria-label="Resumo do atendimento" className="hidden border-l border-line p-4 sm:block">
            <p className="eyebrow text-muted">Resumo</p>
            <dl className="mt-3 space-y-3">
              {summary.map(([term, value]) => (
                <div key={term}>
                  <dt className="text-[0.6875rem] text-muted">{term}</dt>
                  <dd className="text-[0.8125rem] font-medium text-ink">{value}</dd>
                </div>
              ))}
              <div>
                <dt className="text-[0.6875rem] text-muted">Situação</dt>
                <dd className="mt-1">
                  <Badge tone="success" dot>
                    Agendado
                  </Badge>
                </dd>
              </div>
            </dl>
          </aside>
        </div>

        {/* Campo de resposta (inerte, apenas visual) */}
        <div aria-hidden="true" className="flex items-center gap-3 border-t border-line px-4 py-3 text-muted">
          <Paperclip className="size-4" />
          <span className="flex-1 truncate rounded-md border border-line bg-canvas px-3 py-1.5 text-xs">O agente responde conforme as regras da clínica</span>
          <Mic className="size-4" />
        </div>
      </div>

      {/* Confirmação flutuante */}
      <div
        className="relative mt-4 flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-md motion-safe:animate-enter sm:absolute sm:-bottom-7 sm:-left-8 sm:mt-0 sm:w-72"
        style={{ animationDelay: "950ms" }}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-success" aria-hidden="true">
          <Check className="size-4.5" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 text-sm">
          <p className="font-medium text-ink">Avaliação confirmada</p>
          <p className="text-muted">Quinta-feira · 09:00</p>
        </div>
      </div>

      <figcaption className="mt-4 text-center text-xs text-muted sm:mt-12 sm:text-right">Exemplo ilustrativo com dados fictícios.</figcaption>
    </figure>
  );
}
