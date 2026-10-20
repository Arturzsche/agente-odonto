import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type FeedbackTone = "info" | "success" | "warning" | "danger";

/** Estilos e ícones dos tons de feedback — compartilhados por Alert e Toast. */
export const feedbackTones: Record<FeedbackTone, { icon: LucideIcon; iconColor: string; box: string }> = {
  info: { icon: Info, iconColor: "text-brand", box: "border-brand-ring bg-brand-soft" },
  success: { icon: CircleCheck, iconColor: "text-success", box: "border-success/20 bg-success-soft" },
  warning: { icon: TriangleAlert, iconColor: "text-warning", box: "border-warning/20 bg-warning-soft" },
  danger: { icon: CircleAlert, iconColor: "text-danger", box: "border-danger/20 bg-danger-soft" },
};

/**
 * Mensagem contextual na página. `danger` usa role="alert" (anunciado na hora);
 * os demais usam role="status".
 */
export function Alert({ tone = "info", title, children, action, className }: { tone?: FeedbackTone; title: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const { icon: Icon, iconColor, box } = feedbackTones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border p-4", box, className)}>
      <Icon className={cn("mt-0.5 size-4.5 shrink-0", iconColor)} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium text-ink">{title}</p>
        {children && <div className="mt-1 text-ink-soft">{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

/**
 * Estado vazio: explica por que não há conteúdo e qual é o próximo passo.
 * Não é um erro — use Alert tone="danger" para falhas.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: { icon?: LucideIcon; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {Icon && (
        <span className="mb-4 flex size-11 items-center justify-center rounded-lg border border-line bg-surface text-muted shadow-xs" aria-hidden="true">
          <Icon className="size-5" />
        </span>
      )}
      <p className="text-[0.9375rem] font-semibold text-ink">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
