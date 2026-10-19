import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatNumber, formatPercent } from "@/lib/format";
import { Tooltip } from "@/components/ui/tooltip";
import type { Kpi } from "@/types/domain";

/**
 * Indicador com contexto: valor, variação contra o período anterior e definição (tooltip).
 * `goodDirection` define se subir é bom (verde) ou ruim (âmbar). Variação nunca só por cor:
 * sempre com seta e texto.
 */
export function KpiCard({
  kpi,
  goodDirection = "up",
  periodLabel,
  className,
}: {
  kpi: Kpi;
  goodDirection?: "up" | "down" | "neutral";
  /** Ex.: "vs. 7 dias anteriores" */
  periodLabel?: string;
  className?: string;
}) {
  const hasDelta = kpi.previousValue !== null && kpi.previousValue > 0;
  const delta = hasDelta ? (kpi.value - (kpi.previousValue as number)) / (kpi.previousValue as number) : 0;
  const direction = !hasDelta || Math.abs(delta) < 0.005 ? "flat" : delta > 0 ? "up" : "down";
  const positive = goodDirection === "neutral" || direction === "flat" ? null : direction === goodDirection;
  const Arrow = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <div className={cn("rounded-xl border border-line bg-surface p-5 shadow-xs", className)}>
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium text-muted">{kpi.label}</p>
        <Tooltip content={kpi.definition}>
          <button type="button" aria-label={`O que é: ${kpi.label}`} className="rounded text-subtle transition-colors hover:text-muted focus-visible:outline-2 focus-visible:outline-brand-600">
            <Info className="size-3.5" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
      <p className="tabular mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-navy-900">{formatNumber(kpi.value)}</p>
      <div className="mt-3 flex min-h-5 items-center gap-1.5 text-xs">
        {hasDelta ? (
          <>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-medium",
                positive === null ? "bg-canvas text-ink-soft" : positive ? "bg-success-50 text-success-800" : "bg-warning-50 text-warning-700",
              )}
            >
              <Arrow className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{direction === "up" ? "Aumento de" : direction === "down" ? "Redução de" : "Variação de"}</span>
              {formatPercent(Math.abs(delta))}
            </span>
            {periodLabel && <span className="text-muted">{periodLabel}</span>}
          </>
        ) : (
          <span className="text-muted">{kpi.previousValue === null ? "Situação atual" : "Sem base de comparação"}</span>
        )}
      </div>
    </div>
  );
}
