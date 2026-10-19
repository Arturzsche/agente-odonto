"use client";

import { SegmentedControl } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import type { PeriodKey } from "@/types/domain";
import { useUrlFilters } from "./use-url-filters";

const DEFAULTS = { period: "7d" };

const OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
];

/** Seletor de período ligado ao parâmetro ?period= da URL (padrão 7d). */
export function PeriodFilter({ value }: { value: PeriodKey }) {
  const { set, isPending } = useUrlFilters(DEFAULTS);
  return (
    <div className="flex items-center gap-2">
      {isPending && <Spinner className="size-4 text-muted" label="Atualizando período" />}
      <SegmentedControl label="Período" options={OPTIONS} value={value} onChange={(period) => set({ period })} />
    </div>
  );
}
