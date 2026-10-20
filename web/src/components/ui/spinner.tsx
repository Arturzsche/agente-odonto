import { cn } from "@/lib/cn";

/** Indicador de carregamento circular. `label` é anunciado a leitores de tela. */
export function Spinner({ className, label = "Carregando" }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn("inline-flex size-4 shrink-0", className)}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-full animate-spin motion-reduce:animate-none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Bloco de esqueleto para conteúdo em carregamento. Decorativo. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block h-4 animate-pulse rounded-sm bg-line motion-reduce:animate-none", className)} />;
}
