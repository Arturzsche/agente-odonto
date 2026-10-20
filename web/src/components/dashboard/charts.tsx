"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Gráficos leves em HTML/CSS (sem biblioteca). Regras do painel:
 * - cores categóricas em ordem fixa (chart-1 → chart-4), sempre com legenda;
 * - barras finas (≤ 24px), ponta arredondada, base reta, 2px de respiro entre segmentos;
 * - dica ao passar o mouse e tabela com os dados para leitura acessível.
 */

export type ChartColor = 1 | 2 | 3 | 4;
const fills: Record<ChartColor, string> = { 1: "bg-chart-1", 2: "bg-chart-2", 3: "bg-chart-3", 4: "bg-chart-4" };

export interface Series {
  key: string;
  label: string;
  color: ChartColor;
}

export interface ColumnDatum {
  /** Rótulo curto do eixo (ex.: "20/10"). */
  label: string;
  /** Rótulo completo para a dica e a tabela (ex.: "terça-feira, 20 de outubro"). */
  fullLabel?: string;
  values: Record<string, number>;
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

/** Teto do eixo com 4 intervalos inteiros e "redondos": 23 → 24, 137 → 160. */
function niceMax(value: number) {
  if (value <= 0) return 4;
  const raw = value / 4;
  if (raw <= 10) return Math.ceil(raw) * 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 4, 5, 10].map((m) => m * magnitude).find((m) => m >= raw && Number.isInteger(m)) ?? 10 * magnitude;
  return step * 4;
}

export function Swatch({ color, className }: { color: ChartColor; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-2.5 shrink-0 rounded-[3px]", fills[color], className)} />;
}

export function Legend({ series, values }: { series: Series[]; values?: Record<string, ReactNode> }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-soft">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <Swatch color={s.color} />
          {s.label}
          {values?.[s.key] !== undefined && <span className="tabular font-semibold text-ink">{values[s.key]}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Colunas (empilhadas quando há mais de uma série) ao longo do tempo. */
export function ColumnChart({ data, series, height = 200, unit }: { data: ColumnDatum[]; series: Series[]; height?: number; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = data.map((d) => series.reduce((sum, s) => sum + (d.values[s.key] ?? 0), 0));
  const max = niceMax(Math.max(...totals, 0));
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  // Mostra no máximo ~8 rótulos no eixo X.
  const every = Math.max(1, Math.ceil(data.length / 8));
  const active = hover === null ? null : data[hover];

  return (
    <div aria-hidden="true" className="select-none">
      <div className="flex gap-2">
        {/* Eixo Y */}
        <div className="tabular relative w-7 shrink-0 text-right text-[0.6875rem] text-muted" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / max) * 100}%` }}>
              {fmt(t)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1" style={{ height }} onPointerLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <span key={t} className={cn("absolute inset-x-0 border-t", t === 0 ? "border-line-strong" : "border-dashed border-line")} style={{ bottom: `${(t / max) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px] sm:gap-1">
            {data.map((d, i) => {
              const visible = series.filter((s) => (d.values[s.key] ?? 0) > 0).reverse();
              return (
                <div key={d.label + i} className="flex h-full min-w-0 flex-1 cursor-default justify-center" onPointerEnter={() => setHover(i)}>
                  <div className={cn("flex h-full w-full max-w-6 flex-col justify-end gap-[2px]", hover !== null && hover !== i && "opacity-60")}>
                    {visible.map((s, j) => (
                      <span
                        key={s.key}
                        className={cn("block w-full shrink-0", fills[s.color], j === 0 && "rounded-t-[4px]")}
                        style={{ height: `calc(${((d.values[s.key] ?? 0) / max) * 100}% - 2px)`, minHeight: 2 }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {active && hover !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 w-max max-w-56 rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-md"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%`, transform: `translateX(${hover > data.length / 2 ? "-105%" : "5%"})` }}
            >
              <p className="font-semibold text-ink">{active.fullLabel ?? active.label}</p>
              <ul className="mt-1 space-y-0.5">
                {series.map((s) => (
                  <li key={s.key} className="flex items-center gap-1.5 text-ink-soft">
                    <Swatch color={s.color} /> {s.label}: <span className="tabular font-semibold text-ink">{fmt(active.values[s.key] ?? 0)}</span>
                  </li>
                ))}
              </ul>
              {series.length > 1 && (
                <p className="mt-1 border-t border-line pt-1 text-muted">
                  Total: <span className="tabular font-semibold text-ink">{fmt(totals[hover])}</span> {unit}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Eixo X */}
      <div className="mt-2 ml-9 flex gap-[2px] sm:gap-1">
        {data.map((d, i) => (
          <span key={d.label + i} className="tabular min-w-0 flex-1 overflow-visible text-center text-[0.6875rem] whitespace-nowrap text-muted">
            {i % every === 0 ? d.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Uma barra 100% dividida em partes, com legenda de valores e percentuais. */
export function ProportionBar({ items }: { items: Array<{ key: string; label: string; value: number; color: ChartColor }> }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  return (
    <div>
      <div aria-hidden="true" className="flex h-3 gap-[2px] overflow-hidden rounded-[4px] bg-canvas">
        {items
          .filter((item) => item.value > 0)
          .map((item) => (
            <span key={item.key} title={`${item.label}: ${item.value}`} className={cn("h-full", fills[item.color])} style={{ width: `${(item.value / Math.max(total, 1)) * 100}%` }} />
          ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-sm">
            <Swatch color={item.color} />
            <span className="min-w-0 flex-1 truncate text-ink-soft">{item.label}</span>
            <span className="tabular font-semibold text-ink">{fmt(item.value)}</span>
            <span className="tabular w-10 text-right text-xs text-muted">{pct(item.value)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barras horizontais de uma série (ranking), com rótulo e valor sempre visíveis. */
export function BarList({ items, color = 1 }: { items: Array<{ key: string; label: string; value: number }>; color?: ChartColor }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink-soft">{item.label}</span>
            <span className="shrink-0">
              <span className="tabular font-semibold text-ink">{fmt(item.value)}</span>
              <span className="tabular ml-2 text-xs text-muted">{total ? Math.round((item.value / total) * 100) : 0}%</span>
            </span>
          </div>
          <div aria-hidden="true" className="mt-1.5 h-2 rounded-[4px] bg-canvas">
            <div className={cn("h-full rounded-[4px]", fills[color])} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Tabela com os dados do gráfico (recolhida por padrão). */
export function ChartTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: Array<Array<string | number>> }) {
  return (
    <details className="group mt-4 border-t border-line pt-3">
      <summary className="inline-flex cursor-pointer items-center gap-1 rounded-xs text-xs font-medium text-brand focus-ring [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
        Ver dados em tabela
      </summary>
      <div className="relative mt-3 max-h-72 overflow-auto rounded-md border border-line focus-ring" tabIndex={0} role="region" aria-label={caption}>
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-canvas text-ink-soft">
            <tr>
              {columns.map((c, i) => (
                <th key={c} scope="col" className={cn("px-3 py-2 font-medium", i > 0 && "text-right")}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="px-3 py-1.5 font-normal text-ink">
                      {cell}
                    </th>
                  ) : (
                    <td key={i} className="tabular px-3 py-1.5 text-right text-ink">
                      {typeof cell === "number" ? fmt(cell) : cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
