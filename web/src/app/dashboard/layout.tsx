import type { Metadata } from "next";
import Link from "next/link";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { Logo } from "@/components/ui/logo";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: { default: "Painel", template: `%s · Painel ${siteConfig.name}` },
  robots: { index: false, follow: false },
};

/** Estrutura provisória do painel: navegação lateral + área de conteúdo. */
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas md:flex-row">
      <aside className="border-b border-line bg-surface p-3 md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <Link href="/" aria-label={`${siteConfig.name} — início`} className="mb-4 flex h-10 items-center rounded-md px-2.5 focus-ring">
          <Logo size="sm" />
        </Link>
        <SidebarNav />
      </aside>
      <main className="flex-1 px-6">{children}</main>
    </div>
  );
}
