import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

/** Título da tela, descrição e ações principais. */
export function PageHeader({ title, description, actions, className }: { title: string; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-navy">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Aviso discreto das limitações da tela (dados fictícios, ações não persistidas…). */
export function DemoNotice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 rounded-md border border-line bg-surface px-3 py-2.5 text-xs text-muted", className)}>
      <Info className="mt-px size-3.5 shrink-0 text-brand" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** Indicador numérico com rótulo e contexto. */
export function StatCard({ label, value, hint, icon, tone = "neutral" }: { label: string; value: string; hint?: ReactNode; icon?: ReactNode; tone?: "neutral" | "warning" | "danger" }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-xs sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-soft">{label}</p>
        {icon && (
          <span
            aria-hidden="true"
            className={cn(
              "flex size-8 items-center justify-center rounded-md [&_svg]:size-4",
              { neutral: "bg-brand-soft text-brand", warning: "bg-warning-soft text-warning", danger: "bg-danger-soft text-danger" }[tone],
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="tabular mt-2 text-[1.75rem] leading-none font-semibold tracking-tight text-navy">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}
