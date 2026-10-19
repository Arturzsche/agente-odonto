import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";

export interface LegendItem {
  label: string;
  color: string;
  /** Valor total opcional exibido junto à legenda */
  value?: string;
}

/**
 * Moldura padrão de gráfico: título, descrição, legenda textual e uma tabela com os mesmos
 * dados para leitores de tela (o SVG do gráfico fica oculto da árvore de acessibilidade).
 */
export function ChartCard({
  title,
  description,
  legend,
  actions,
  table,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  legend?: LegendItem[];
  actions?: ReactNode;
  /** Dados equivalentes ao gráfico, para leitores de tela. */
  table: { caption: string; columns: string[]; rows: Array<Array<string | number>> };
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader title={title} description={description} actions={actions} />
      {legend && legend.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2" aria-label="Legenda">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-xs text-ink-soft">
              <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              {item.label}
              {item.value && <span className="tabular font-medium text-ink">{item.value}</span>}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 min-h-0 flex-1" aria-hidden="true">
        {children}
      </div>
      <table className="sr-only">
        <caption>{table.caption}</caption>
        <thead>
          <tr>
            {table.columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j}>{cell}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/** Conteúdo padrão do tooltip dos gráficos (passe em <Tooltip content={<ChartTooltipContent …/>} />). */
export function ChartTooltipContent({
  active,
  label,
  payload,
  labelFormatter,
  valueFormatter = (v) => String(v),
}: {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ name?: string | number; value?: number | string; color?: string; dataKey?: string | number }>;
  labelFormatter?: (label: string | number) => string;
  valueFormatter?: (value: number | string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-40 rounded-lg border border-line bg-surface px-3 py-2.5 text-xs shadow-md">
      {label !== undefined && <p className="mb-1.5 font-medium text-ink">{labelFormatter ? labelFormatter(label) : label}</p>}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={String(entry.dataKey ?? entry.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-soft">
              <span aria-hidden="true" className="size-2 rounded-sm" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="tabular font-medium text-ink">{entry.value !== undefined ? valueFormatter(entry.value) : "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
