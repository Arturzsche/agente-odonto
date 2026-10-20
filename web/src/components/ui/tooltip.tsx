"use client";

import { cloneElement, useEffect, useId, useState, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Dica curta para complementar um controle (não para informação essencial).
 * Abre no hover e no foco do teclado, fecha com Esc e permanece enquanto o
 * ponteiro estiver sobre ela (WCAG 1.4.13). O filho deve ser UM elemento focável.
 */
export function Tooltip({ content, side = "top", children }: { content: ReactNode; side?: "top" | "bottom"; children: ReactElement<Record<string, unknown>> }) {
  const id = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span className="relative inline-flex" onPointerEnter={() => setOpen(true)} onPointerLeave={() => setOpen(false)}>
      {cloneElement(children, {
        "aria-describedby": open ? id : undefined,
        onFocus: () => setOpen(true),
        onBlur: () => setOpen(false),
      })}
      <span
        id={id}
        role="tooltip"
        className={cn(
          "absolute left-1/2 z-50 w-max max-w-64 -translate-x-1/2 rounded-md bg-navy px-2.5 py-1.5 text-xs leading-relaxed text-white shadow-md",
          "transition-opacity duration-150",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        {content}
      </span>
    </span>
  );
}
