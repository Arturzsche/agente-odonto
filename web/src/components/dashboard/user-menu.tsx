"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ExternalLink, PlugZap, Settings } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

const DEMO_USER = "Equipe Demonstração";

/**
 * Perfil do usuário. Ainda não existe login: o painel roda numa sessão
 * demonstrativa, e o menu diz isso com clareza.
 */
export function UserMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => !root.current?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const item = "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-ink-soft hover:bg-canvas hover:text-ink focus-ring [&_svg]:size-4 [&_svg]:text-muted";

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Perfil: ${DEMO_USER}`}
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 items-center gap-2 rounded-md pr-1.5 pl-1 text-sm hover:bg-canvas focus-ring"
      >
        <Avatar name={DEMO_USER} size="sm" />
        <span className="hidden text-left leading-tight xl:block">
          <span className="block font-medium text-ink">{DEMO_USER}</span>
          <span className="block text-xs text-muted">Sessão demonstrativa</span>
        </span>
        <ChevronDown className={cn("size-4 text-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      <div id={panelId} hidden={!open} className="absolute top-full right-0 z-50 mt-2 w-72 rounded-lg border border-line bg-surface p-1.5 shadow-lg">
        <div className="flex items-center gap-3 border-b border-line px-2.5 pt-2 pb-3">
          <Avatar name={DEMO_USER} size="md" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-ink">{DEMO_USER}</p>
            <p className="mt-0.5 text-xs text-muted">Administrador · sem login</p>
          </div>
        </div>
        <p className="px-2.5 py-2.5 text-xs text-muted">Login e perfis de acesso ainda não estão disponíveis. Este painel usa dados fictícios.</p>
        <nav aria-label="Atalhos do perfil" className="border-t border-line pt-1.5">
          <Link href="/dashboard/configuracoes" className={item} onClick={close}>
            <Settings aria-hidden="true" /> Configurações
          </Link>
          <Link href="/dashboard/integracoes" className={item} onClick={close}>
            <PlugZap aria-hidden="true" /> Integrações
          </Link>
          <Link href="/" className={item} onClick={close}>
            <ExternalLink aria-hidden="true" /> Voltar ao site
          </Link>
        </nav>
      </div>
    </div>
  );
}
