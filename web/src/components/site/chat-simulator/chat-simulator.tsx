"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CalendarClock, CircleAlert, CircleCheck, Info, RotateCcw, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Tabs } from "@/components/ui/navigation";
import { cn } from "@/lib/cn";
import { scenarios, type Author, type Scenario, type Step } from "./scenarios";

type Entry = { id: number; kind: "message"; from: Author; text: string; time: string } | { id: number; kind: "event"; text: string; tone: Extract<Step, { kind: "event" }>["tone"] };

const ID_BASE = "simulador";
const eventIcons = { info: Info, warning: TriangleAlert, danger: CircleAlert, success: CircleCheck } as const;
const eventColors = { info: "text-brand", warning: "text-warning", danger: "text-danger", success: "text-success" } as const;

/* Preferência de movimento reduzido, lida sem efeitos (compatível com SSR). */
const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const useReducedMotion = () =>
  useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(motionQuery).matches,
    () => false,
  );

/** Simulador de conversa com roteiro fixo — nenhuma API é chamada. */
export function ChatSimulator() {
  const [scenario, setScenario] = useState<Scenario>(scenarios[0]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [queue, setQueue] = useState<Step[]>(scenarios[0].branches.inicio);
  const [typing, setTyping] = useState(false);
  const [started, setStarted] = useState(false);
  const reducedMotion = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  // Começa a tocar quando o simulador aparece na tela.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Executa o próximo passo automático da fila (mensagens e eventos).
  useEffect(() => {
    const step = queue[0];
    if (!started || !step || step.kind === "choices" || step.kind === "slots") return;

    const factor = reducedMotion ? 0.25 : 1;
    const pause = (step.kind === "message" && step.from === "paciente" ? 700 : 350) * factor;
    const thinking = step.kind === "message" && step.from === "agente" ? (step.typing ?? 900) * factor : 0;

    const timers: ReturnType<typeof setTimeout>[] = [];
    if (thinking) timers.push(setTimeout(() => setTyping(true), pause));
    timers.push(
      setTimeout(() => {
        setTyping(false);
        nextId.current += 1;
        const id = nextId.current;
        setEntries((list) => [...list, step.kind === "message" ? { id, kind: "message", from: step.from, text: step.text, time: step.time } : { id, kind: "event", text: step.text, tone: step.tone }]);
        setQueue((q) => q.slice(1));
      }, pause + thinking),
    );
    return () => timers.forEach(clearTimeout);
  }, [queue, started, reducedMotion]);

  // Mantém a última mensagem visível dentro da janela (sem rolar a página).
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
  }, [entries, typing, reducedMotion]);

  const restart = (next: Scenario = scenario) => {
    setScenario(next);
    setEntries([]);
    setTyping(false);
    setQueue(next.branches.inicio);
    setStarted(true);
  };

  const goTo = (branch: string, patientText?: string, time?: string) => {
    if (patientText && time) {
      nextId.current += 1;
      const id = nextId.current;
      setEntries((list) => [...list, { id, kind: "message", from: "paciente", text: patientText, time }]);
    }
    setQueue(scenario.branches[branch]);
  };

  const pending = queue[0]?.kind === "choices" || queue[0]?.kind === "slots" ? queue[0] : null;
  const finished = started && queue.length === 0 && !typing;
  const lastTime = [...entries].reverse().find((e) => e.kind === "message");

  return (
    <div ref={root} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-md">
      {/* Cenários */}
      <div className="flex items-center gap-2 border-b border-line pr-3 pl-1">
        <Tabs
          idBase={ID_BASE}
          label="Cenários da demonstração"
          value={scenario.id}
          onChange={(id) => restart(scenarios.find((s) => s.id === id) ?? scenarios[0])}
          options={scenarios.map((s) => ({ value: s.id, label: s.label }))}
          className="min-w-0 flex-1 border-b-0"
        />
        <IconButton label="Reiniciar conversa" icon={<RotateCcw />} size="sm" onClick={() => restart()} />
      </div>

      <div id={`${ID_BASE}-panel-${scenario.id}`} role="tabpanel" aria-labelledby={`${ID_BASE}-tab-${scenario.id}`}>
        {/* Cabeçalho da conversa */}
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={scenario.patient} size="sm" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-ink">{scenario.patient}</p>
              <p className="truncate text-xs text-muted">Paciente fictício · WhatsApp</p>
            </div>
          </div>
          <Badge tone="warning">Demonstração</Badge>
        </div>

        {/* Mensagens */}
        <div ref={log} role="log" aria-live="polite" aria-label="Conversa simulada" tabIndex={0} className="h-[26rem] overflow-y-auto bg-canvas px-4 py-5 focus-visible:outline-offset-[-2px]">
          <ol className="space-y-2.5">
          {entries.map((entry) =>
            entry.kind === "message" ? (
              <li key={entry.id} className={cn("flex", entry.from === "agente" ? "justify-end" : "justify-start", !reducedMotion && "animate-enter")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-snug shadow-xs",
                    entry.from === "agente" ? "rounded-tr-xs bg-brand-soft text-ink ring-1 ring-brand-ring" : "rounded-tl-xs border border-line bg-surface text-ink",
                  )}
                >
                  <span className={cn("mb-0.5 block text-[0.6875rem] font-medium", entry.from === "agente" ? "text-brand" : "text-ink-soft")}>
                    {entry.from === "agente" ? "OdontoAgent" : scenario.patient}
                  </span>
                  {entry.text}
                  <span className={cn("tabular mt-1 block text-right text-[0.6875rem]", entry.from === "agente" ? "text-ink-soft" : "text-muted")}>{entry.time}</span>
                </div>
              </li>
            ) : (
              <EventRow key={entry.id} text={entry.text} tone={entry.tone} animate={!reducedMotion} />
            ),
          )}
          {typing && (
            <li className="flex justify-end" aria-label="OdontoAgent está processando">
              <span className="inline-flex items-center gap-1 rounded-lg rounded-tr-xs bg-brand-soft px-3 py-3 ring-1 ring-brand-ring">
                {[0, 1, 2].map((i) => (
                  <span key={i} aria-hidden="true" className="size-1.5 animate-pulse-dot rounded-full bg-brand" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </span>
            </li>
          )}
          {!started && entries.length === 0 && <li className="pt-24 text-center text-sm text-muted">A conversa começa quando esta seção aparece na tela.</li>}
          </ol>
        </div>

        {/* Interação do visitante e rodapé */}
        <div className="min-h-[4.5rem] border-t border-line px-4 py-3">
          {pending?.kind === "choices" && (
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-muted">{pending.prompt}</legend>
              <div className="flex flex-wrap gap-2">
                {pending.options.map((option) => (
                  <Button key={option.next} variant="secondary" size="sm" onClick={() => goTo(option.next)}>
                    {option.label}
                  </Button>
                ))}
              </div>
            </fieldset>
          )}
          {pending?.kind === "slots" && (
            <fieldset>
              <legend className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
                <CalendarClock className="size-3.5" aria-hidden="true" /> {pending.label} — escolha um horário
              </legend>
              <div className="flex flex-wrap gap-2">
                {pending.slots.map((slot) => (
                  <Button key={slot} variant="secondary" size="sm" className="tabular" onClick={() => goTo(pending.next, slot, lastTime?.kind === "message" ? lastTime.time : "")}>
                    Amanhã, {slot}
                  </Button>
                ))}
              </div>
            </fieldset>
          )}
          {finished && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">Fim da demonstração deste cenário.</p>
              <Button variant="tertiary" size="sm" icon={<RotateCcw />} onClick={() => restart()}>
                Ver de novo
              </Button>
            </div>
          )}
          {!pending && !finished && <p className="pt-2 text-xs text-muted">Simulação com roteiro fixo. Nenhuma mensagem é enviada a pacientes reais.</p>}
        </div>
      </div>
    </div>
  );
}

function EventRow({ text, tone, animate }: { text: string; tone: keyof typeof eventIcons; animate: boolean }) {
  const Icon = eventIcons[tone];
  return (
    <li className={cn("flex justify-center py-1", animate && "animate-enter")}>
      <span className="inline-flex max-w-[92%] items-start gap-1.5 rounded-md bg-surface px-2.5 py-1.5 text-xs text-ink-soft ring-1 ring-line">
        <Icon className={cn("mt-px size-3.5 shrink-0", eventColors[tone])} aria-hidden="true" />
        {text}
      </span>
    </li>
  );
}
