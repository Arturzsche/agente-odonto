"use client";

import { useId, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export interface AccordionItem {
  id: string;
  question: ReactNode;
  answer: ReactNode;
}

/**
 * Accordion acessível (padrão WAI-ARIA: botão com aria-expanded + região rotulada).
 * Vários itens podem ficar abertos ao mesmo tempo.
 */
export function Accordion({ items, headingLevel = 3, className }: { items: AccordionItem[]; headingLevel?: 2 | 3 | 4; className?: string }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const baseId = useId();
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((item) => {
        const expanded = open.has(item.id);
        const buttonId = `${baseId}-${item.id}-btn`;
        const panelId = `${baseId}-${item.id}-panel`;
        return (
          <div key={item.id}>
            <Heading className="m-0">
              <button
                id={buttonId}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className={cn(
                  "group flex w-full items-center justify-between gap-6 py-5 text-left text-base font-medium text-navy-900",
                  "transition-colors duration-150 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
                )}
              >
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-[transform,background-color,color] duration-200",
                    "group-hover:border-line-strong group-hover:text-ink",
                    expanded && "rotate-45 bg-navy-900 text-white group-hover:text-white",
                  )}
                >
                  <Plus className="size-4" />
                </span>
              </button>
            </Heading>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!expanded}
              className="pb-6 pr-12 text-[0.9375rem] leading-relaxed text-muted"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
