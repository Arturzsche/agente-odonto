"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowLeft, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo, LogoMark } from "@/components/ui/logo";
import { IconButton } from "@/components/ui/button";
import type { DataSourceKind, Notification } from "@/types/domain";
import { allDashboardItems, dashboardNav, isActive } from "./nav";
import { Topbar } from "./topbar";

export interface ShellUser {
  name: string;
  roleLabel: string;
}

export interface DashboardShellProps {
  source: DataSourceKind;
  clinicName: string;
  waitingCount: number;
  notifications: Notification[];
  /** "Agora" do servidor (ISO), referência para tempos relativos. */
  referenceAt: string;
  user: ShellUser;
  /** Exibe "Sair" (sessão real). No modo demonstrativo não há sessão. */
  canSignOut: boolean;
  children: ReactNode;
}

const COLLAPSE_KEY = "oa:sidebar-collapsed";
const COLLAPSE_EVENT = "oa:sidebar-collapsed-change";

/** Preferência local de barra recolhida (conveniência visual; falha silenciosamente sem storage). */
function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}
function subscribeCollapsed(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(COLLAPSE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(COLLAPSE_EVENT, onChange);
  };
}

export function DashboardShell({ source, clinicName, waitingCount, notifications, referenceAt, user, canSignOut, children }: DashboardShellProps) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const drawer = useRef<HTMLDialogElement>(null);

  // Fecha a gaveta ao navegar (ajuste de estado durante a renderização, sem efeito).
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  const toggleCollapsed = () => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "0" : "1");
    } catch {
      /* armazenamento indisponível */
    }
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  };

  useEffect(() => {
    const dialog = drawer.current;
    if (!dialog) return;
    if (mobileOpen && !dialog.open) dialog.showModal();
    if (!mobileOpen && dialog.open) dialog.close();
  }, [mobileOpen]);

  const current = allDashboardItems.find((item) => isActive(pathname, item.href));
  const counters = { aguardando: waitingCount };

  const navList = (compact: boolean) => (
    <nav aria-label="Navegação do painel" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {dashboardNav.map((group, gi) => (
        <div key={gi}>
          {group.title && (
            <p className={cn("eyebrow mb-2 px-2.5 text-[0.6875rem] text-muted", compact && "sr-only")}>{group.title}</p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const count = item.counter ? counters[item.counter] : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={compact ? item.label : undefined}
                    className={cn(
                      "group relative flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium transition-colors duration-150",
                      "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600",
                      active ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-canvas hover:text-ink",
                      compact && "justify-center px-0",
                    )}
                  >
                    <item.icon className={cn("size-[1.125rem] shrink-0", active ? "text-brand-600" : "text-muted group-hover:text-ink-soft")} aria-hidden="true" />
                    <span className={cn("truncate", compact && "sr-only")}>{item.label}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "tabular ml-auto rounded-full bg-warning-50 px-1.5 text-[0.6875rem] font-semibold leading-5 text-warning-700 ring-1 ring-inset ring-warning-700/20",
                          compact && "absolute -right-0.5 -top-0.5 ml-0 leading-4",
                        )}
                      >
                        {count}
                        <span className="sr-only"> aguardando a equipe</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const sidebarFooter = (compact: boolean) => (
    <div className={cn("border-t border-line p-3", compact && "px-2")}>
      <Link
        href="/"
        title={compact ? "Voltar ao site" : undefined}
        className={cn(
          "flex h-9 items-center gap-3 rounded-md px-2.5 text-sm text-muted transition-colors duration-150 hover:bg-canvas hover:text-ink",
          "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600",
          compact && "justify-center px-0",
        )}
      >
        <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
        <span className={cn(compact && "sr-only")}>Voltar ao site</span>
      </Link>
    </div>
  );

  return (
    <div className="min-h-dvh bg-canvas" data-collapsed={collapsed || undefined} data-source={source}>
      {/* Barra lateral: ícones no tablet (md), completa no desktop (lg), recolhível pelo usuário */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface md:flex",
          "w-[72px] transition-[width] duration-200",
          collapsed ? "lg:w-[72px]" : "lg:w-60",
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-line px-4", collapsed ? "justify-center" : "lg:justify-between max-lg:justify-center")}>
          <Link href="/dashboard" aria-label="OdontoAgent — visão geral" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
            <LogoMark className={cn("size-7", !collapsed && "lg:hidden")} />
            <Logo size="sm" className={cn("hidden", !collapsed && "lg:inline-flex")} />
          </Link>
        </div>
        {/* Versão compacta (ícones) e completa; a visível depende da largura e da preferência */}
        <div className={cn("flex flex-1 flex-col overflow-hidden", !collapsed && "lg:hidden")}>
          {navList(true)}
          {sidebarFooter(true)}
        </div>
        <div className={cn("hidden flex-1 flex-col overflow-hidden", !collapsed && "lg:flex")}>
          {navList(false)}
          {sidebarFooter(false)}
        </div>
        <div className="hidden border-t border-line p-2 lg:block">
          <IconButton label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"} size="sm" onClick={toggleCollapsed} className={cn(collapsed ? "mx-auto flex" : "ml-auto flex")}>
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </IconButton>
        </div>
      </aside>

      {/* Gaveta de navegação no celular */}
      <dialog
        ref={drawer}
        aria-label="Menu do painel"
        onCancel={(e) => {
          e.preventDefault();
          setMobileOpen(false);
        }}
        onClick={(e) => e.target === drawer.current && setMobileOpen(false)}
        className="m-0 h-dvh max-h-none w-[18rem] max-w-[85vw] border-r border-line bg-surface p-0 backdrop:bg-navy-950/40 open:flex open:flex-col"
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-4">
          <Logo size="sm" />
          <IconButton label="Fechar menu" size="sm" onClick={() => setMobileOpen(false)}>
            <X />
          </IconButton>
        </div>
        {navList(false)}
        {sidebarFooter(false)}
      </dialog>

      <div className={cn("flex min-h-dvh flex-col md:pl-[72px]", collapsed ? "lg:pl-[72px]" : "lg:pl-60")}>
        <Topbar
          clinicName={clinicName}
          sectionLabel={current?.label ?? "Painel"}
          notifications={notifications}
          referenceAt={referenceAt}
          user={user}
          canSignOut={canSignOut}
          onOpenMenu={() => setMobileOpen(true)}
        />
        <main id="conteudo" tabIndex={-1} className="w-full max-w-[1440px] flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
