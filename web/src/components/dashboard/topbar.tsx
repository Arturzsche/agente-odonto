"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Building2, ChevronDown, LogOut, Menu, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import { IconButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Popover } from "@/components/ui/popover";
import type { Notification } from "@/types/domain";
import { GlobalSearch } from "./global-search";
import type { ShellUser } from "./shell";

export function Topbar({
  clinicName,
  sectionLabel,
  notifications,
  referenceAt,
  user,
  canSignOut,
  onOpenMenu,
}: {
  clinicName: string;
  sectionLabel: string;
  notifications: Notification[];
  /** "Agora" do servidor, para tempos relativos idênticos no servidor e no cliente. */
  referenceAt: string;
  user: ShellUser;
  canSignOut: boolean;
  onOpenMenu: () => void;
}) {
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(notifications.filter((n) => n.read).map((n) => n.id)));
  const unread = notifications.filter((n) => !readIds.has(n.id)).length;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur-sm supports-[backdrop-filter]:bg-surface/85 sm:px-6 lg:px-8">
      <IconButton label="Abrir menu" onClick={onOpenMenu} className="-ml-2 md:hidden">
        <Menu />
      </IconButton>

      {/* Clínica atual e seção — referência de onde o usuário está */}
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="hidden items-center gap-1.5 font-medium text-ink sm:inline-flex">
          <Building2 className="size-4 text-muted" aria-hidden="true" />
          <span className="truncate">{clinicName}</span>
        </span>
        <span aria-hidden="true" className="hidden text-line-strong sm:inline">
          /
        </span>
        <span className="truncate text-muted">{sectionLabel}</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <GlobalSearch className="hidden w-64 md:block xl:w-80" />

        <Popover
          label="Notificações"
          trigger={(props) => (
            <IconButton label={unread ? `Notificações: ${unread} não lidas` : "Notificações"} {...props} className="relative">
              <Bell />
              {unread > 0 && <span aria-hidden="true" className="absolute right-2 top-2 size-2 rounded-full bg-danger-700 ring-2 ring-surface" />}
            </IconButton>
          )}
        >
          {(close) => (
            <div>
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="text-sm font-semibold text-ink">Notificações</p>
                <button
                  type="button"
                  disabled={unread === 0}
                  onClick={() => setReadIds(new Set(notifications.map((n) => n.id)))}
                  className="rounded text-xs font-medium text-brand-600 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-600 disabled:text-muted"
                >
                  Marcar todas como lidas
                </button>
              </div>
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">Nenhuma notificação por enquanto.</p>
              ) : (
                <ul className="max-h-96 divide-y divide-line overflow-y-auto">
                  {notifications.map((n) => {
                    const isRead = readIds.has(n.id);
                    return (
                      <li key={n.id}>
                        <Link
                          href={n.href}
                          onClick={() => {
                            setReadIds((prev) => new Set(prev).add(n.id));
                            close();
                          }}
                          className="flex gap-3 px-4 py-3 transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600"
                        >
                          <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", isRead ? "bg-transparent" : "bg-brand-600")} />
                          <span className="min-w-0">
                            <span className={cn("block text-sm", isRead ? "text-ink-soft" : "font-medium text-ink")}>
                              {n.title}
                              {!isRead && <span className="sr-only"> (não lida)</span>}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted">{n.description}</span>
                            <span className="mt-1 block text-xs text-muted">{formatRelative(n.createdAt, referenceAt)}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </Popover>

        <Popover
          label="Menu do usuário"
          className="w-64"
          trigger={(props) => (
            <button
              type="button"
              {...props}
              className="flex h-10 items-center gap-2 rounded-md pl-1 pr-1.5 transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:pr-2"
            >
              <Avatar name={user.name} size="sm" />
              <span className="sr-only">Abrir menu do usuário: {user.name}</span>
              <ChevronDown className="hidden size-4 text-muted sm:block" aria-hidden="true" />
            </button>
          )}
        >
          {(close) => (
            <div className="py-1.5">
              <div className="border-b border-line px-4 pb-3 pt-2">
                <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.roleLabel}</p>
              </div>
              <div className="p-1.5">
                <Link
                  href="/dashboard/configuracoes"
                  onClick={close}
                  className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-ink-soft hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600"
                >
                  <Settings className="size-4 text-muted" aria-hidden="true" />
                  Configurações
                </Link>
                {canSignOut ? (
                  <form action="/api/auth/logout" method="post">
                    <button
                      type="submit"
                      className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-ink-soft hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600"
                    >
                      <LogOut className="size-4 text-muted" aria-hidden="true" />
                      Sair
                    </button>
                  </form>
                ) : (
                  <Link
                    href="/"
                    onClick={close}
                    className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-ink-soft hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600"
                  >
                    <LogOut className="size-4 text-muted" aria-hidden="true" />
                    Sair da demonstração
                  </Link>
                )}
              </div>
            </div>
          )}
        </Popover>
      </div>
    </header>
  );
}
