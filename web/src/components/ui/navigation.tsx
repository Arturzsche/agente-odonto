"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/* --------------------------------------------------------------- NavLink */

/**
 * Link de navegação que indica a página atual (aria-current="page").
 * `match="exact"` para rotas raiz (ex.: /dashboard); "prefix" inclui subpáginas.
 */
export function NavLink({
  href,
  icon: Icon,
  match = "prefix",
  variant = "sidebar",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { href: string; icon?: LucideIcon; match?: "exact" | "prefix"; variant?: "sidebar" | "top" }) {
  const pathname = usePathname();
  const active = match === "exact" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group inline-flex items-center gap-2.5 text-sm font-medium transition-colors duration-150 focus-ring",
        variant === "sidebar" && [
          "h-9 w-full rounded-md px-2.5",
          active ? "bg-brand-soft text-brand" : "text-ink-soft hover:bg-canvas hover:text-ink",
        ],
        variant === "top" && ["h-9 rounded-sm px-1", active ? "text-ink" : "text-muted hover:text-ink"],
        className,
      )}
      {...props}
    >
      {Icon && <Icon className={cn("size-4.5 shrink-0", active ? "text-brand" : "text-faint group-hover:text-ink-soft")} aria-hidden="true" />}
      {children}
    </Link>
  );
}

/* --------------------------------------------------------------- Tabs */

export interface TabOption<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

/**
 * Abas (padrão WAI-ARIA tablist): setas, Home e End movem a seleção.
 * Os painéis devem usar <TabPanel> com o mesmo `idBase`.
 */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  label,
  idBase,
  className,
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  idBase: string;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const last = options.length - 1;
    const target = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    onChange(options[target].value);
    refs.current[target]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-1 overflow-x-auto border-b border-line", className)}>
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
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "-mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors duration-150",
              "focus-visible:outline-offset-[-2px]",
              selected ? "border-brand text-ink" : "border-transparent text-muted hover:border-line-strong hover:text-ink",
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

export function TabPanel({ idBase, value, active, children, className }: { idBase: string; value: string; active: boolean; children: ReactNode; className?: string }) {
  return (
    <div id={`${idBase}-panel-${value}`} role="tabpanel" aria-labelledby={`${idBase}-tab-${value}`} hidden={!active} tabIndex={0} className={cn("focus-visible:outline-offset-4", className)}>
      {active && children}
    </div>
  );
}

/* --------------------------------------------------------------- Breadcrumbs */

/** Trilha de navegação. O último item é a página atual (sem link). */
export function Breadcrumbs({ items, className }: { items: Array<{ label: string; href?: string }>; className?: string }) {
  return (
    <nav aria-label="Trilha de navegação" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !current ? (
                <Link href={item.href} className="rounded-xs text-muted transition-colors hover:text-ink focus-ring">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={current ? "page" : undefined} className={current ? "font-medium text-ink" : "text-muted"}>
                  {item.label}
                </span>
              )}
              {!current && <ChevronRight className="size-3.5 text-faint" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
