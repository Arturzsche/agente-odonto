"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

/**
 * Lê e atualiza filtros guardados na URL (?status=…&q=…).
 * A página (Server Component) relê os searchParams e busca os dados filtrados;
 * `isPending` indica que a nova versão está a caminho (mostre feedback visual).
 *
 * Valores vazios, null ou iguais a `defaults[chave]` são removidos da URL.
 */
export function useUrlFilters(defaults: Record<string, string> = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const get = useCallback((key: string) => searchParams.get(key) ?? defaults[key] ?? "", [searchParams, defaults]);

  const set = useCallback(
    (updates: Record<string, string | null | undefined>, options: { resetKeys?: string[] } = {}) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "" || value === defaults[key]) next.delete(key);
        else next.set(key, value);
      }
      for (const key of options.resetKeys ?? []) next.delete(key);
      const query = next.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [router, pathname, searchParams, defaults],
  );

  return { get, set, isPending, searchParams };
}
