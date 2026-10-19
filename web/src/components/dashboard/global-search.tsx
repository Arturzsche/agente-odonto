"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { MessagesSquare, Search, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/spinner";

interface SearchResult {
  id: string;
  kind: "paciente" | "conversa";
  title: string;
  subtitle: string;
  href: string;
}

type State = { status: "idle" } | { status: "loading" } | { status: "done"; results: SearchResult[] } | { status: "error" };

/**
 * Busca global do painel (combobox WAI-ARIA): pacientes e conversas.
 * Consulta /api/painel/busca, que usa a mesma fonte de dados das páginas.
 */
export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState({ status: "loading" });
      try {
        const res = await fetch(`/api/painel/busca?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { results: SearchResult[] };
        setState({ status: "done", results: body.results });
        setActive(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setState({ status: "error" });
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  const showPanel = open && query.trim().length >= 2;
  const results = state.status === "done" && showPanel ? state.results : [];
  const go = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  };

  return (
    <div ref={wrapper} className={cn("relative", className)} role="search">
      <label htmlFor={`${id}-input`} className="sr-only">
        Buscar pacientes e conversas
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        id={`${id}-input`}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        placeholder="Buscar pacientes e conversas"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            const target = results[active] ?? results[0];
            if (target) {
              e.preventDefault();
              go(target);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-9 w-full rounded-md border border-line bg-canvas pl-9 pr-3 text-sm text-ink placeholder:text-muted transition-[border-color,box-shadow,background-color] duration-150 hover:border-line-strong focus:border-brand-600 focus:bg-surface focus:shadow-focus focus:outline-none"
      />

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {state.status === "loading" && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted">
              <Spinner className="size-4" label="Buscando" /> Buscando…
            </div>
          )}
          {state.status === "error" && <p className="px-4 py-3 text-sm text-danger-700">Não foi possível buscar agora. Tente novamente.</p>}
          {state.status === "done" && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted">Nenhum paciente ou conversa encontrado para “{query.trim()}”.</p>
          )}
          <ul id={listId} role="listbox" aria-label="Resultados da busca" className={cn("max-h-80 overflow-y-auto p-1.5", results.length === 0 && "hidden")}>
            {results.map((result, index) => {
              const Icon = result.kind === "paciente" ? User : MessagesSquare;
              return (
                <li
                  key={`${result.kind}-${result.id}`}
                  id={`${id}-opt-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    go(result);
                  }}
                  onPointerEnter={() => setActive(index)}
                  className={cn("flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2", index === active ? "bg-brand-50" : "hover:bg-canvas")}
                >
                  <Icon className="size-4 shrink-0 text-muted" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{result.title}</span>
                    <span className="block truncate text-xs text-muted">{result.subtitle}</span>
                  </span>
                  <span className="ml-auto shrink-0 text-[0.6875rem] text-muted">{result.kind === "paciente" ? "Paciente" : "Conversa"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
