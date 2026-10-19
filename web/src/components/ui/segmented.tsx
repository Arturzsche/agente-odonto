"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Contagem opcional exibida ao lado do rótulo (ex.: filtros). */
  count?: number;
}

/**
 * Grupo de opções mutuamente exclusivas (filtros, períodos, modos de visualização).
 * Semântica de radiogroup: setas movem a seleção; Tab sai do grupo.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Nome acessível do grupo. */
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-lg border border-line bg-canvas p-0.5", className)}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-[background-color,color,box-shadow] duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[0.8125rem]",
              selected ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn("tabular rounded px-1 text-[0.6875rem]", selected ? "bg-canvas text-ink-soft" : "text-muted")}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Abas (tablist) — para alternar painéis de conteúdo dentro da mesma página.
 * Os painéis devem usar id={`${idBase}-panel-${value}`} e aria-labelledby={`${idBase}-tab-${value}`}.
 */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  label,
  idBase,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  idBase: string;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    let next = -1;
    if (event.key === "ArrowRight") next = (index + 1) % options.length;
    if (event.key === "ArrowLeft") next = (index - 1 + options.length) % options.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = options.length - 1;
    if (next < 0) return;
    event.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-1 border-b border-line", className)}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            id={`${idBase}-tab-${option.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idBase}-panel-${option.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600",
              selected ? "border-brand-600 text-ink" : "border-transparent text-muted hover:border-line-strong hover:text-ink",
            )}
          >
            {option.label}
            {option.count !== undefined && <span className="tabular text-xs text-muted">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
