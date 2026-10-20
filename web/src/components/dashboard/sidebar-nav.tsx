"use client";

import { BookOpenText, CalendarDays, ChartColumnBig, LayoutDashboard, MessagesSquare, PlugZap, Settings, Users, type LucideIcon } from "lucide-react";
import { NavLink } from "@/components/ui/navigation";
import { dashboardNav } from "@/config/navigation";

/** Ícone de cada rota do painel (a configuração de rotas fica em config/navigation.ts). */
const icons: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/conversas": MessagesSquare,
  "/dashboard/agendamentos": CalendarDays,
  "/dashboard/pacientes": Users,
  "/dashboard/conhecimento": BookOpenText,
  "/dashboard/relatorios": ChartColumnBig,
  "/dashboard/integracoes": PlugZap,
  "/dashboard/configuracoes": Settings,
};

/** Navegação lateral do painel. `onNavigate` fecha a gaveta no celular. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Navegação do painel">
      <ul className="space-y-0.5">
        {dashboardNav.map((item) => (
          <li key={item.href}>
            <NavLink href={item.href} icon={icons[item.href]} match={item.href === "/dashboard" ? "exact" : "prefix"} onClick={onNavigate}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
