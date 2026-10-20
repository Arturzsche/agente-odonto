"use client";

import { cn } from "@/lib/cn";

/** Seletor de opções exclusivas (ex.: período). Cada botão indica a seleção com aria-pressed. */
export function Segmented<T extends string>({ label, options, value, onChange, className }: { label: string; options: Array<{ value: T; label: string }>; value: T; onChange: (value: T) => void; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex rounded-md border border-line bg-surface p-0.5 shadow-xs", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-8 rounded-[5px] px-3 text-[0.8125rem] font-medium whitespace-nowrap transition-colors focus-ring",
            option.value === value ? "bg-navy text-white" : "text-ink-soft hover:bg-canvas hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
