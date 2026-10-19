"use client";

import { cloneElement, isValidElement, useEffect, useId, useState, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Dica curta mostrada no hover e no foco do teclado (WCAG 1.4.13: dispensável com Esc,
 * persistente enquanto o ponteiro está sobre ela). O conteúdo é ligado via aria-describedby.
 * O filho deve ser um único elemento focável (botão, link…).
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: ReactNode;
  children: ReactElement<Record<string, unknown>>;
  side?: "top" | "bottom";
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!isValidElement(children)) return children;

  const trigger = cloneElement(children, {
    "aria-describedby": open ? id : undefined,
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
  });

  return (
    <span className="relative inline-flex" onPointerEnter={() => setOpen(true)} onPointerLeave={() => setOpen(false)}>
      {trigger}
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-auto absolute left-1/2 z-50 w-max max-w-64 -translate-x-1/2 rounded-md bg-navy-900 px-2.5 py-1.5",
          "text-left text-xs font-normal leading-relaxed text-white shadow-md",
          "transition-opacity duration-150",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          open ? "visible opacity-100" : "invisible opacity-0",
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}
