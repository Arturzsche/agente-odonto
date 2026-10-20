"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, AudioLines, Headset, Inbox, Lock, RotateCcw, UserCheck, CircleCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Checkbox, Field, SearchInput, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { datePart, formatDayLabel, formatRelative, timePart } from "@/lib/dates";
import { matches, plural } from "@/lib/text";
import { contactReason, conversationStatus } from "@/services/dashboard/labels";
import type { Conversation, ConversationStatus, Message } from "@/services/dashboard/types";
import { DemoNotice, PageHeader } from "../page-header";

type Filter = "todas" | ConversationStatus;

const handoffReasons = ["Paciente pediu para falar com uma pessoa", "Relato de dor ou urgência", "Pergunta fora da base de conhecimento", "Pedido de encaixe ou exceção na agenda", "Outro motivo"];

export function ConversationsView({ now, initial, initialId, initialQuery }: { now: string; initial: Conversation[]; initialId: string | null; initialQuery: string }) {
  const toast = useToast();
  const [conversations, setConversations] = useState(initial);
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>("todas");
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initial.some((c) => c.id === initialId) ? initialId : null);
  const [handoffOpen, setHandoffOpen] = useState(false);

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { todas: conversations.length, agente: 0, aguardando: 0, equipe: 0, encerrada: 0 };
    for (const c of conversations) result[c.status]++;
    return result;
  }, [conversations]);

  const visible = conversations
    .filter((c) => (filter === "todas" || c.status === filter) && (!onlyUrgent || c.urgent) && matches(query, c.patientName, c.phoneMasked, c.messages.map((m) => m.text).join(" ")))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const select = (id: string | null) => {
    setSelectedId(id);
    window.history.replaceState(null, "", id ? `?c=${id}` : window.location.pathname);
  };

  /** Altera o status e registra o evento na conversa. Só vale nesta página (demonstração). */
  const transition = (id: string, status: ConversationStatus, event: string, extra?: Partial<Conversation>) => {
    setConversations((list) =>
      list.map((c) => {
        if (c.id !== id) return c;
        const message: Message = { id: `${id}-evt-${c.messages.length + 1}`, from: "sistema", text: event, at: now };
        return { ...c, ...extra, status, messages: [...c.messages, message], lastMessageAt: now };
      }),
    );
    toast({ title: event, description: "Alteração feita só nesta demonstração: nada foi enviado ao agente ou ao paciente.", tone: "success" });
  };

  const statusFilters: Array<{ value: Filter; label: string }> = [
    { value: "todas", label: "Todos os status" },
    ...(Object.keys(conversationStatus) as ConversationStatus[]).map((s) => ({ value: s, label: conversationStatus[s].label })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Conversas" description="Acompanhe os atendimentos do WhatsApp, veja o histórico e encaminhe para a equipe quando precisar de uma pessoa." />
      <DemoNotice>Conversas e pacientes fictícios. Mudanças de status valem só enquanto esta página estiver aberta e não são enviadas ao agente.</DemoNotice>

      <div className="grid grid-cols-[minmax(0,1fr)] overflow-hidden lg:h-[calc(100dvh-14rem)] lg:min-h-[34rem] rounded-lg border border-line bg-surface shadow-xs lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Lista */}
        <section aria-label="Lista de conversas" className={cn("flex min-h-0 flex-col border-line lg:border-r", selected && "hidden lg:flex")}>
          <div className="space-y-3 border-b border-line p-4">
            <SearchInput aria-label="Buscar conversas" placeholder="Nome, telefone ou mensagem" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <Select aria-label="Filtrar por status" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="h-9">
                  {statusFilters.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label} ({counts[f.value]})
                    </option>
                  ))}
                </Select>
              </div>
              <Checkbox label="Prioridade" checked={onlyUrgent} onChange={(e) => setOnlyUrgent(e.target.checked)} className="shrink-0" />
            </div>
          </div>
          <p className="border-b border-line px-4 py-2 text-xs text-muted" aria-live="polite">
            {plural(visible.length, "conversa")}
          </p>
          {visible.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nenhuma conversa encontrada"
              description="Ajuste a busca ou os filtros para ver outras conversas."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setFilter("todas");
                    setOnlyUrgent(false);
                  }}
                >
                  Limpar filtros
                </Button>
              }
            />
          ) : (
            <ul className="max-h-[70dvh] min-h-0 flex-1 divide-y divide-line overflow-y-auto lg:max-h-none">
              {visible.map((c) => {
                const last = c.messages.at(-1);
                const status = conversationStatus[c.status];
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-current={c.id === selectedId ? "true" : undefined}
                      onClick={() => select(c.id)}
                      className={cn("flex w-full gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-offset-[-2px]", c.id === selectedId ? "bg-brand-soft" : "hover:bg-canvas")}
                    >
                      <Avatar name={c.patientName} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-ink">{c.patientName}</span>
                          <span className="tabular shrink-0 text-xs text-muted">{formatRelative(c.lastMessageAt, now)}</span>
                        </span>
                        <span className={cn("mt-0.5 block truncate text-sm", c.id === selectedId ? "text-ink-soft" : "text-muted")}>
                          {last?.from === "agente" ? "Agente: " : last?.from === "equipe" ? "Equipe: " : ""}
                          {last?.text}
                        </span>
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          <Badge tone={status.tone}>{status.label}</Badge>
                          {c.urgent && <Badge tone="danger">Prioridade</Badge>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Conversa */}
        <section aria-label="Conversa selecionada" className={cn("min-h-0 flex-col", selected ? "flex" : "hidden lg:flex")}>
          {selected ? (
            <ConversationDetail
              conversation={selected}
              now={now}
              onBack={() => select(null)}
              onHandoff={() => setHandoffOpen(true)}
              onAssume={() => transition(selected.id, "equipe", "Você assumiu a conversa")}
              onReturn={() => transition(selected.id, "agente", "Conversa devolvida ao agente")}
              onClose={() => transition(selected.id, "encerrada", "Atendimento encerrado pela equipe")}
            />
          ) : (
            <EmptyState className="m-auto" icon={Inbox} title="Selecione uma conversa" description="Escolha um atendimento na lista para ver as mensagens e as ações disponíveis." />
          )}
        </section>
      </div>

      {selected && (
        <HandoffModal
          open={handoffOpen}
          patientName={selected.patientName}
          onClose={() => setHandoffOpen(false)}
          onConfirm={(reason) => {
            setHandoffOpen(false);
            transition(selected.id, "aguardando", `Encaminhada para a equipe · ${reason}`, { handoffReason: reason });
          }}
        />
      )}
    </div>
  );
}

function ConversationDetail({
  conversation: c,
  now,
  onBack,
  onHandoff,
  onAssume,
  onReturn,
  onClose,
}: {
  conversation: Conversation;
  now: string;
  onBack: () => void;
  onHandoff: () => void;
  onAssume: () => void;
  onReturn: () => void;
  onClose: () => void;
}) {
  const status = conversationStatus[c.status];
  const today = datePart(now);

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <Button variant="tertiary" size="sm" icon={<ArrowLeft />} onClick={onBack} className="-ml-2 lg:hidden">
          Voltar
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={c.patientName} size="md" />
          <div className="min-w-0 leading-tight">
            <h2 className="truncate font-semibold text-ink">{c.patientName}</h2>
            <p className="tabular mt-0.5 truncate text-xs text-muted">
              {c.phoneMasked} · {contactReason[c.reason]}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
          {c.urgent && <Badge tone="danger">Prioridade</Badge>}
        </div>
      </header>

      {(c.status === "aguardando" || c.status === "equipe") && c.handoffReason && (
        <div className="border-b border-line px-4 py-3 sm:px-5">
          <Alert tone={c.urgent ? "danger" : "warning"} title={c.status === "aguardando" ? "Aguardando alguém da equipe" : "Atendimento com a equipe"}>
            Motivo do encaminhamento: {c.handoffReason}. {c.urgent && "Relatos de dor são priorizados; o agente não diagnostica nem indica medicamentos."}
          </Alert>
        </div>
      )}

      <ol tabIndex={0} aria-label={`Mensagens com ${c.patientName}`} className="h-[60dvh] min-h-0 flex-1 focus-visible:outline-offset-[-2px] space-y-2.5 overflow-y-auto lg:h-auto bg-canvas px-4 py-5 sm:px-6">
        {c.messages.map((m, i) => {
          const showDay = i === 0 || datePart(c.messages[i - 1].at) !== datePart(m.at);
          return (
            <li key={m.id}>
              {showDay && <p className="my-3 text-center text-xs font-medium text-muted">{formatDayLabel(datePart(m.at), today)}</p>}
              <MessageBubble message={m} patientName={c.patientName} />
            </li>
          );
        })}
      </ol>

      <footer className="space-y-3 border-t border-line p-4 sm:px-5">
        <div className="flex flex-wrap gap-2">
          {c.status === "agente" && (
            <Button icon={<Headset />} onClick={onHandoff}>
              Encaminhar para a equipe
            </Button>
          )}
          {c.status === "aguardando" && (
            <>
              <Button icon={<UserCheck />} onClick={onAssume}>
                Assumir atendimento
              </Button>
              <Button variant="secondary" icon={<RotateCcw />} onClick={onReturn}>
                Devolver ao agente
              </Button>
            </>
          )}
          {c.status === "equipe" && (
            <>
              <Button icon={<CircleCheck />} onClick={onClose}>
                Encerrar atendimento
              </Button>
              <Button variant="secondary" icon={<RotateCcw />} onClick={onReturn}>
                Devolver ao agente
              </Button>
            </>
          )}
          {c.status === "encerrada" && <p className="text-sm text-muted">Atendimento encerrado. Uma nova mensagem do paciente abre outro atendimento.</p>}
        </div>
        <div className="relative">
          <label htmlFor={`resposta-${c.id}`} className="sr-only">
            Responder ao paciente
          </label>
          <textarea
            id={`resposta-${c.id}`}
            disabled
            rows={2}
            aria-describedby={`resposta-${c.id}-aviso`}
            placeholder="Responder ao paciente…"
            className="block w-full resize-none rounded-md border border-line bg-canvas px-3 py-2.5 text-sm text-muted"
          />
          <p id={`resposta-${c.id}-aviso`} className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
            <Lock className="size-3.5" aria-hidden="true" /> Responder pelo painel ainda não está disponível: o painel não está conectado ao WhatsApp.
          </p>
        </div>
      </footer>
    </>
  );
}

function MessageBubble({ message: m, patientName }: { message: Message; patientName: string }) {
  if (m.from === "sistema") {
    return (
      <p className="flex justify-center">
        <span className="rounded-md bg-surface px-2.5 py-1 text-xs text-ink-soft ring-1 ring-line">
          {m.text} · <span className="tabular">{timePart(m.at)}</span>
        </span>
      </p>
    );
  }
  const outgoing = m.from !== "paciente";
  return (
    <div className={cn("flex", outgoing ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-snug shadow-xs sm:max-w-[70%]",
          m.from === "paciente" && "rounded-tl-xs border border-line bg-surface",
          m.from === "agente" && "rounded-tr-xs bg-brand-soft ring-1 ring-brand-ring",
          m.from === "equipe" && "rounded-tr-xs bg-success-soft ring-1 ring-success/20",
        )}
      >
        <span className={cn("mb-0.5 block text-[0.6875rem] font-medium", { paciente: "text-ink-soft", agente: "text-brand", equipe: "text-success-strong" }[m.from])}>
          {m.from === "paciente" ? patientName : m.from === "agente" ? "OdontoAgent" : "Equipe da clínica"}
        </span>
        {m.audio && (
          <span className="mb-1 flex items-center gap-1 text-xs text-ink-soft">
            <AudioLines className="size-3.5" aria-hidden="true" /> Áudio transcrito
          </span>
        )}
        <span className="text-ink">{m.text}</span>
        <span className="tabular mt-1 block text-right text-[0.6875rem] text-ink-soft">{timePart(m.at)}</span>
      </div>
    </div>
  );
}

function HandoffModal({ open, patientName, onClose, onConfirm }: { open: boolean; patientName: string; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState(handoffReasons[0]);
  const [note, setNote] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Encaminhar para a equipe"
      description={`A conversa com ${patientName} vai para a fila da equipe e o agente deixa de responder.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon={<Headset />} onClick={() => onConfirm(note.trim() ? `${reason} (${note.trim()})` : reason)}>
            Encaminhar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Motivo">
          {(p) => (
            <Select {...p} value={reason} onChange={(e) => setReason(e.target.value)}>
              {handoffReasons.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Observação para a equipe" optional hint="Visível só para a equipe.">
          {(p) => <Textarea {...p} rows={3} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
      </div>
    </Modal>
  );
}
