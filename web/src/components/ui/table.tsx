import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * Tabela de dados. Em telas pequenas, prefira renderizar a mesma informação como lista
 * de cartões (ver DESIGN.md → "Tabelas no mobile") em vez de forçar rolagem horizontal.
 */
export function Table({ className, caption, children, ...props }: ComponentProps<"table"> & { caption?: string }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-left text-sm", className)} {...props}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function THead({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("border-b border-line bg-canvas/70", className)} {...props} />;
}

export function TBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("divide-y divide-line", className)} {...props} />;
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("transition-colors duration-150 hover:bg-canvas/60", className)} {...props} />;
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return <th scope="col" className={cn("h-10 whitespace-nowrap px-4 text-xs font-medium text-muted first:pl-5 last:pr-5", className)} {...props} />;
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("h-14 px-4 align-middle text-ink first:pl-5 last:pr-5", className)} {...props} />;
}
