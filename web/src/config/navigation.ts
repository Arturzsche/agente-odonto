import type { NavItem } from "@/types/navigation";

/**
 * Mapa de rotas do produto. As páginas ainda não implementadas exibem um aviso
 * de "em construção"; este arquivo é a referência de quais rotas existem.
 */

export const dashboardOverview: NavItem = {
  href: "/dashboard",
  label: "Visão geral",
  description: "Resumo da operação de atendimento.",
};

/** Seções do painel, servidas por /dashboard/[secao]. A chave é o segmento da URL. */
export const dashboardSections = {
  conversas: { href: "/dashboard/conversas", label: "Conversas", description: "Central de atendimento e histórico de conversas." },
  agendamentos: { href: "/dashboard/agendamentos", label: "Agendamentos", description: "Consultas marcadas, filtros e agenda." },
  pacientes: { href: "/dashboard/pacientes", label: "Pacientes", description: "Contatos e informações necessárias para a operação." },
  conhecimento: { href: "/dashboard/conhecimento", label: "Base de conhecimento", description: "Informações aprovadas que o agente usa para responder." },
  relatorios: { href: "/dashboard/relatorios", label: "Relatórios", description: "Indicadores operacionais por período." },
  integracoes: { href: "/dashboard/integracoes", label: "Integrações", description: "Status das integrações configuradas." },
  configuracoes: { href: "/dashboard/configuracoes", label: "Configurações", description: "Preferências da clínica e perfis de acesso." },
} satisfies Record<string, NavItem>;

export type DashboardSectionKey = keyof typeof dashboardSections;

export function isDashboardSection(value: string): value is DashboardSectionKey {
  return Object.hasOwn(dashboardSections, value);
}

export const dashboardNav: NavItem[] = [dashboardOverview, ...Object.values(dashboardSections)];
