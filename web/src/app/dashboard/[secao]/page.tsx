import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UnderConstruction } from "@/components/shared/under-construction";
import { dashboardSections, isDashboardSection } from "@/config/navigation";

/**
 * Rota provisória para as seções do painel. Cada seção ganhará sua própria pasta
 * (ex.: app/dashboard/conversas/) quando for implementada; segmentos estáticos têm
 * prioridade sobre este dinâmico, então a substituição é gradual.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(dashboardSections).map((secao) => ({ secao }));
}

export async function generateMetadata({ params }: PageProps<"/dashboard/[secao]">): Promise<Metadata> {
  const { secao } = await params;
  return isDashboardSection(secao) ? { title: dashboardSections[secao].label } : {};
}

export default async function DashboardSectionPage({ params }: PageProps<"/dashboard/[secao]">) {
  const { secao } = await params;
  if (!isDashboardSection(secao)) notFound();
  const section = dashboardSections[secao];
  return <UnderConstruction title={section.label} description={section.description} backHref="/dashboard" backLabel="Voltar à visão geral" />;
}
