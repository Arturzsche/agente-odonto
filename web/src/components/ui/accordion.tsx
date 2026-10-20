"use client";

import { useId, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
}

/**
 * Accordion (padrão WAI-ARIA): cada cabeçalho é um botão com aria-expanded que
 * controla uma região rotulada. Vários itens podem ficar abertos.
 */
export function Accordion({ items, headingLevel = 3, className }: { items: AccordionItem[]; headingLevel?: 2 | 3 | 4; className?: string }) {
  const baseId = useId();
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const Heading = `h${headingLevel}` as const;

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((item) => {
        const expanded = open.has(item.id);
        const buttonId = `${baseId}-${item.id}`;
        const panelId = `${buttonId}-painel`;
        return (
          <div key={item.id}>
            <Heading>
              <button
                id={buttonId}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="group flex w-full items-center justify-between gap-6 py-5 text-left text-base font-medium text-navy transition-colors hover:text-brand focus-ring"
              >
                {item.title}
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-[transform,background-color,color,border-color] duration-200",
                    expanded ? "rotate-45 border-navy bg-navy text-white" : "group-hover:border-line-strong group-hover:text-ink",
                  )}
                >
                  <Plus className="size-4" />
                </span>
              </button>
            </Heading>
            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!expanded} className="max-w-prose pr-12 pb-6 text-[0.9375rem] leading-relaxed text-muted">
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
