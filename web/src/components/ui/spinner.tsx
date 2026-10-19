import { cn } from "@/lib/cn";

/** Indicador de carregamento. `label` é lido por leitores de tela. */
export function Spinner({ className, label = "Carregando" }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn("inline-flex", className)}>
      <svg viewBox="0 0 24 24" fill="none" className="size-full animate-spin motion-reduce:animate-none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Bloco cinza para estados de carregamento (esqueleto). */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block animate-pulse rounded-md bg-line/70 motion-reduce:animate-none", className)} />;
}
