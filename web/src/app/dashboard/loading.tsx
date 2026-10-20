import { Skeleton } from "@/components/ui/spinner";

/** Esqueleto exibido enquanto uma tela do painel carrega. */
export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Carregando a página" className="space-y-6">
      <h1 className="sr-only">Carregando…</h1>
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}
