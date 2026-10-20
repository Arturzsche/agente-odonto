"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { ArrowLeft, FlaskConical, Menu, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { siteConfig } from "@/config/site";
import type { SearchIndex } from "@/services/dashboard";
import { GlobalSearch } from "./global-search";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

/** Estrutura do painel: barra lateral (gaveta no celular), cabeçalho e área principal. */
export function DashboardShell({ searchIndex, children }: { searchIndex: SearchIndex; children: ReactNode }) {
  const drawer = useRef<HTMLDialogElement>(null);
  const closeDrawer = () => drawer.current?.close();

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <a href="#painel-conteudo" className="sr-only z-[60] rounded-md bg-navy px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Pular para o conteúdo
      </a>

      {/* Barra lateral fixa (desktop) */}
      <aside className="hidden border-r border-line bg-surface lg:block">
        <div className="sticky top-0 flex h-dvh flex-col">
          <Sidebar />
        </div>
      </aside>

      {/* Gaveta (celular e tablet) */}
      <dialog
        ref={drawer}
        aria-label="Menu do painel"
        onClick={(event) => event.target === drawer.current && closeDrawer()}
        className="m-0 h-dvh max-h-dvh w-72 max-w-[85vw] border-r border-line bg-surface p-0 shadow-lg backdrop:bg-navy/40 open:animate-enter lg:hidden"
      >
        <div className="flex h-full flex-col">
          <IconButton label="Fechar menu" icon={<X />} onClick={closeDrawer} className="absolute top-3 right-3" />
          <Sidebar onNavigate={closeDrawer} />
        </div>
      </dialog>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-surface">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <IconButton label="Abrir menu" icon={<Menu />} onClick={() => drawer.current?.showModal()} className="-ml-2 lg:hidden" />
            <GlobalSearch index={searchIndex} />
            <div className="ml-auto flex items-center gap-3">
              <Badge tone="warning" dot className="hidden md:inline-flex">
                Dados demonstrativos
              </Badge>
              <UserMenu />
            </div>
          </div>
        </header>

        <main id="painel-conteudo" tabIndex={-1} className="flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center border-b border-line px-5">
        <Link href="/dashboard" aria-label={`${siteConfig.name} — visão geral do painel`} className="rounded-sm focus-ring" onClick={onNavigate}>
          <Logo size="sm" />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav onNavigate={onNavigate} />
      </div>
      <div className="space-y-3 border-t border-line p-3">
        <div className="rounded-md bg-warning-soft p-3 text-xs text-ink-soft">
          <p className="flex items-center gap-1.5 font-semibold text-warning">
            <FlaskConical className="size-3.5" aria-hidden="true" /> Modo demonstração
          </p>
          <p className="mt-1">Dados fictícios. O painel ainda não está conectado ao agente.</p>
        </div>
        <Link href="/" onClick={onNavigate} className="flex h-9 items-center gap-2 rounded-md px-2.5 text-sm text-ink-soft hover:bg-canvas hover:text-ink focus-ring">
          <ArrowLeft className="size-4 text-muted" aria-hidden="true" /> Voltar ao site
        </Link>
      </div>
    </>
  );
}
