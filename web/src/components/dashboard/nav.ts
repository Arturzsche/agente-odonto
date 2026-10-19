import {
  BookOpenText,
  CalendarDays,
  ChartColumnBig,
  LayoutDashboard,
  MessagesSquare,
  PlugZap,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Chave para exibir contador (ex.: conversas aguardando). */
  counter?: "aguardando";
}

export const dashboardNav: { title?: string; items: DashboardNavItem[] }[] = [
  {
    items: [
      { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
      { href: "/dashboard/conversas", label: "Conversas", icon: MessagesSquare, counter: "aguardando" },
      { href: "/dashboard/agendamentos", label: "Agendamentos", icon: CalendarDays },
      { href: "/dashboard/pacientes", label: "Pacientes", icon: Users },
    ],
  },
  {
    title: "Agente",
    items: [
      { href: "/dashboard/conhecimento", label: "Base de conhecimento", icon: BookOpenText },
      { href: "/dashboard/relatorios", label: "Relatórios", icon: ChartColumnBig },
    ],
  },
  {
    title: "Clínica",
    items: [
      { href: "/dashboard/integracoes", label: "Integrações", icon: PlugZap },
      { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export const allDashboardItems = dashboardNav.flatMap((group) => group.items);

/** Item ativo: correspondência exata para a visão geral, por prefixo para as demais. */
export function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(`${href}/`);
}
