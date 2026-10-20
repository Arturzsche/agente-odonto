"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FileText, MessagesSquare, Search, User } from "lucide-react";
import { dashboardNav } from "@/config/navigation";
import { cn } from "@/lib/cn";
import { matches } from "@/lib/text";
import type { SearchIndex } from "@/services/dashboard";

interface Result {
  id: string;
  group: "Páginas" | "Conversas" | "Pacientes";
  label: string;
  detail?: string;
  href: string;
}

const groupIcons = { Páginas: FileText, Conversas: MessagesSquare, Pacientes: User } as const;
const PER_GROUP = 4;

/**
 * Busca global do cabeçalho (padrão combobox): páginas, conversas e pacientes.
 * Atalho "/" foca o campo; setas navegam; Enter abre; Esc fecha.
 */
export function GlobalSearch({ index }: { index: SearchIndex }) {
  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo<Result[]>(() => {
    if (!query.trim()) return [];
    const pages = dashboardNav.filter((item) => matches(query, item.label, item.description)).map((item) => ({ id: item.href, group: "Páginas" as const, label: item.label, href: item.href }));
    const conversations = index.conversations
      .filter((c) => matches(query, c.patientName, c.preview))
      .map((c) => ({ id: c.id, group: "Conversas" as const, label: c.patientName, detail: c.preview, href: `/dashboard/conversas?c=${c.id}` }));
    const patients = index.patients.filter((p) => matches(query, p.name)).map((p) => ({ id: p.id, group: "Pacientes" as const, label: p.name, href: `/dashboard/pacientes?q=${encodeURIComponent(p.name)}` }));
    return [...pages.slice(0, PER_GROUP), ...conversations.slice(0, PER_GROUP), ...patients.slice(0, PER_GROUP)];
  }, [query, index]);

  // Atalho "/" (fora de campos de texto).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key !== "/" || target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      event.preventDefault();
      input.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (result: Result) => {
    setOpen(false);
    setQuery("");
    (document.activeElement as HTMLElement | null)?.blur();
    router.push(result.href);
  };

  const showList = open && query.trim().length > 0;
  const optionId = (i: number) => `${id}-opcao-${i}`;

  return (
    <div
      ref={root}
      className="relative w-full max-w-md"
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <label htmlFor={`${id}-campo`} className="sr-only">
        Buscar no painel
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        ref={input}
        id={`${id}-campo`}
        type="search"
        role="combobox"
        autoComplete="off"
        aria-expanded={showList}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? optionId(active) : undefined}
        placeholder="Buscar no painel…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!results.length) return;
            setOpen(true);
            setActive((i) => (i + (event.key === "ArrowDown" ? 1 : results.length - 1)) % results.length);
          } else if (event.key === "Enter" && showList && results[active]) {
            event.preventDefault();
            go(results[active]);
          } else if (event.key === "Escape") {
            if (query) setQuery("");
            else input.current?.blur();
            setOpen(false);
          }
        }}
        className={cn(
          "block h-9 w-full rounded-md border border-line bg-canvas pr-3 pl-9 text-sm text-ink placeholder:text-muted",
          "transition-[border-color,box-shadow] duration-150 hover:border-line-strong focus:border-brand focus:bg-surface focus:ring-3 focus:ring-brand/15 focus:outline-none",
        )}
      />
      <kbd aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-xs border border-line bg-surface px-1.5 text-[0.6875rem] text-muted sm:block">
        /
      </kbd>

      <div
        id={`${id}-lista`}
        role="listbox"
        aria-label="Resultados da busca"
        hidden={!showList}
        className="absolute top-full right-0 left-0 z-50 mt-2 max-h-[70dvh] min-w-72 overflow-y-auto rounded-lg border border-line bg-surface p-1.5 shadow-lg"
      >
        {results.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted">Nenhum resultado para “{query.trim()}”.</p>
        ) : (
          (["Páginas", "Conversas", "Pacientes"] as const).map((group) => {
            const items = results.map((result, i) => ({ result, i })).filter(({ result }) => result.group === group);
            if (items.length === 0) return null;
            const Icon = groupIcons[group];
            return (
              <div key={group} role="group" aria-labelledby={`${id}-grupo-${group}`}>
                <p id={`${id}-grupo-${group}`} className="px-2.5 pt-2 pb-1 text-xs font-medium text-muted">
                  {group}
                </p>
                {items.map(({ result, i }) => (
                  <div
                    key={result.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    tabIndex={-1}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => go(result)}
                    className={cn("flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink", i === active && "bg-brand-soft")}
                  >
                    <Icon className="size-4 shrink-0 text-muted" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{result.label}</span>
                      {result.detail && <span className={cn("block truncate text-xs", i === active ? "text-ink-soft" : "text-muted")}>{result.detail}</span>}
                    </span>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
