import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Superfície de conteúdo. `padding="none"` para tabelas e listas de borda a borda. */
export function Card({ className, padding = "md", elevated = false, ...props }: ComponentProps<"div"> & { padding?: "none" | "sm" | "md" | "lg"; elevated?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface",
        elevated ? "shadow-md" : "shadow-xs",
        { none: "", sm: "p-4", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" }[padding],
        className,
      )}
      {...props}
    />
  );
}

/** Cabeçalho de card: título, descrição e ações alinhadas à direita. */
export function CardHeader({
  title,
  description,
  actions,
  as: Heading = "h3",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  as?: "h2" | "h3" | "h4";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2", className)}>
      <div className="min-w-0">
        <Heading className="text-[0.9375rem] font-semibold text-ink">{title}</Heading>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Rodapé de card com ações, separado por uma borda. */
export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("-mx-5 mt-5 -mb-5 flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5 sm:-mx-6 sm:-mb-6 sm:px-6", className)} {...props} />;
}
