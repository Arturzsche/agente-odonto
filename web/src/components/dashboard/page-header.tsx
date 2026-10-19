import type { ReactNode } from "react";
import { DemoBadge } from "@/components/ui/demo-badge";
import type { DataSourceKind } from "@/types/domain";

/**
 * Cabeçalho de cada página do painel: h1 único da página, descrição curta, ações e
 * selo de dados demonstrativos quando a fonte é "demo".
 */
export function PageHeader({
  title,
  description,
  actions,
  source,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  source: DataSourceKind;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 lg:mb-8">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-navy-900">{title}</h1>
          {source === "demo" && <DemoBadge />}
        </div>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
