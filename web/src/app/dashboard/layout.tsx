import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { siteConfig } from "@/config/site";
import { getSearchIndex } from "@/services/dashboard";

export const metadata: Metadata = {
  title: { default: "Painel", template: `%s · Painel ${siteConfig.name}` },
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const searchIndex = await getSearchIndex();
  return <DashboardShell searchIndex={searchIndex}>{children}</DashboardShell>;
}
