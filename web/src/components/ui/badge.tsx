import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { AppointmentStatus, ConversationPriority, ConversationStatus, IntegrationStatus } from "@/types/domain";

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "navy";

const tones: Record<BadgeTone, { box: string; dot: string }> = {
  neutral: { box: "bg-canvas text-ink-soft ring-line", dot: "bg-subtle" },
  brand: { box: "bg-brand-50 text-brand-700 ring-brand-100", dot: "bg-brand-600" },
  success: { box: "bg-success-50 text-success-800 ring-success-700/15", dot: "bg-success-700" },
  warning: { box: "bg-warning-50 text-warning-700 ring-warning-700/15", dot: "bg-warning-700" },
  danger: { box: "bg-danger-50 text-danger-700 ring-danger-700/15", dot: "bg-danger-700" },
  navy: { box: "bg-navy-900 text-white ring-navy-900", dot: "bg-white" },
};

interface BadgeProps {
  tone?: BadgeTone;
  /** Ponto colorido à esquerda. O texto continua obrigatório: status nunca só por cor. */
  dot?: boolean;
  icon?: ReactNode;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", dot, icon, size = "sm", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1 ring-inset",
        size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-[0.8125rem]",
        "[&_svg]:size-3.5",
        tones[tone].box,
        className,
      )}
    >
      {dot && <span aria-hidden="true" className={cn("size-1.5 rounded-full", tones[tone].dot)} />}
      {icon}
      {children}
    </span>
  );
}

/* ------------------------- Mapeamentos de status ------------------------- */

export const conversationStatusMeta: Record<ConversationStatus, { label: string; tone: BadgeTone }> = {
  agente: { label: "Com o agente", tone: "brand" },
  aguardando_equipe: { label: "Aguardando equipe", tone: "warning" },
  em_atendimento_humano: { label: "Com a equipe", tone: "navy" },
  encerrada: { label: "Encerrada", tone: "neutral" },
};

export const appointmentStatusMeta: Record<AppointmentStatus, { label: string; tone: BadgeTone }> = {
  agendado: { label: "Agendado", tone: "brand" },
  confirmado: { label: "Confirmado", tone: "success" },
  concluido: { label: "Concluído", tone: "neutral" },
  cancelado: { label: "Cancelado", tone: "danger" },
  faltou: { label: "Não compareceu", tone: "warning" },
};

export const integrationStatusMeta: Record<IntegrationStatus, { label: string; tone: BadgeTone }> = {
  conectado: { label: "Conectado", tone: "success" },
  demonstrativo: { label: "Demonstrativo", tone: "neutral" },
  pendente: { label: "Pendente de configuração", tone: "warning" },
  erro: { label: "Com falha", tone: "danger" },
};

export function ConversationStatusBadge({ status, className }: { status: ConversationStatus; className?: string }) {
  const meta = conversationStatusMeta[status];
  return (
    <Badge tone={meta.tone} dot className={className}>
      {meta.label}
    </Badge>
  );
}

export function AppointmentStatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const meta = appointmentStatusMeta[status];
  return (
    <Badge tone={meta.tone} dot className={className}>
      {meta.label}
    </Badge>
  );
}

export function IntegrationStatusBadge({ status, className }: { status: IntegrationStatus; className?: string }) {
  const meta = integrationStatusMeta[status];
  return (
    <Badge tone={meta.tone} dot className={className}>
      {meta.label}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: { priority: ConversationPriority; className?: string }) {
  if (priority !== "alta") return null;
  return (
    <Badge tone="danger" className={className}>
      <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
        <path d="M8 1.5a1 1 0 0 1 .87.5l6 10.5A1 1 0 0 1 14 14H2a1 1 0 0 1-.87-1.5l6-10.5A1 1 0 0 1 8 1.5Zm0 4a.75.75 0 0 0-.75.75v3a.75.75 0 0 0 1.5 0v-3A.75.75 0 0 0 8 5.5Zm0 6.75a.88.88 0 1 0 0-1.75.88.88 0 0 0 0 1.75Z" />
      </svg>
      Prioridade alta
    </Badge>
  );
}
