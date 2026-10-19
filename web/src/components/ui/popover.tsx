"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/cn";

/**
 * Painel suspenso ancorado a um botão (notificações, menu de perfil…).
 * Fecha com Esc (devolvendo o foco ao botão) e com clique fora.
 * `trigger` recebe as props de acessibilidade que devem ir no botão.
 */
export function Popover({
  trigger,
  children,
  align = "end",
  className,
  label,
}: {
  trigger: (props: { "aria-expanded": boolean; "aria-controls": string; "aria-haspopup": "dialog"; onClick: () => void; ref: RefObject<HTMLButtonElement | null> }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  className?: string;
  /** Nome acessível do painel. */
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={wrapper} className="relative">
      {trigger({
        "aria-expanded": open,
        "aria-controls": id,
        "aria-haspopup": "dialog",
        onClick: () => setOpen((v) => !v),
        ref: button,
      })}
      <div
        id={id}
        role="dialog"
        aria-label={label}
        hidden={!open}
        className={cn(
          "absolute top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] animate-fade-in rounded-xl border border-line bg-surface shadow-lg",
          align === "end" ? "right-0" : "left-0",
          className,
        )}
      >
        {open && children(close)}
      </div>
    </div>
  );
}
