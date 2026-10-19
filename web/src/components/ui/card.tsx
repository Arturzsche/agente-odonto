import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Superfície branca com borda discreta. `padding="none"` para tabelas e listas de borda a borda. */
export function Card({
  className,
  padding = "md",
  elevated = false,
  ...props
}: ComponentProps<"div"> & { padding?: "none" | "sm" | "md" | "lg"; elevated?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-surface",
        elevated ? "shadow-md" : "shadow-xs",
        { none: "", sm: "p-4", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" }[padding],
        className,
      )}
      {...props}
    />
  );
}

/** Cabeçalho de card: título, descrição opcional e ações à direita. */
export function CardHeader({
  title,
  description,
  actions,
  className,
  titleAs: Title = "h2",
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleAs?: "h2" | "h3";
  id?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2", className)}>
      <div className="min-w-0">
        <Title id={id} className="text-[0.9375rem] font-semibold text-ink">
          {title}
        </Title>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
