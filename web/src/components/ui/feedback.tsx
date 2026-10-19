import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type AlertTone = "info" | "success" | "warning" | "error";

const alertStyles: Record<AlertTone, { box: string; icon: string; Icon: typeof Info }> = {
  info: { box: "border-brand-100 bg-brand-50/70", icon: "text-brand-600", Icon: Info },
  success: { box: "border-success-700/15 bg-success-50", icon: "text-success-700", Icon: CheckCircle2 },
  warning: { box: "border-warning-700/15 bg-warning-50", icon: "text-warning-700", Icon: TriangleAlert },
  error: { box: "border-danger-700/15 bg-danger-50", icon: "text-danger-700", Icon: AlertCircle },
};

/** Mensagem contextual dentro da página. Para erros que bloqueiam a ação, use tone="error". */
export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: AlertTone;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { box, icon, Icon } = alertStyles[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border p-4", box, className)}>
      <Icon className={cn("mt-0.5 size-[1.125rem] shrink-0", icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium text-ink">{title}</p>
        {children && <div className="mt-1 text-ink-soft">{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

/**
 * Estado vazio. Explique por que está vazio e o que fazer — não é um erro.
 * Ex.: "Você ainda não tem conversas registradas. Quando novos atendimentos forem recebidos…"
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "px-4 py-8" : "px-6 py-14", className)}>
      {icon && (
        <div className="mb-4 flex size-11 items-center justify-center rounded-lg border border-line bg-surface text-muted shadow-xs [&_svg]:size-5" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-[0.9375rem] font-semibold text-ink">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
