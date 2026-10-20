import type { Metadata } from "next";
import Link from "next/link";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: { default: "Painel", template: `%s · Painel ${siteConfig.name}` },
  robots: { index: false, follow: false },
};

/** Estrutura provisória do painel: navegação lateral + área de conteúdo. */
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-dvh flex-col bg-neutral-50 md:flex-row">
      <aside className="border-b border-neutral-200 bg-white p-4 md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <Link href="/" className="mb-4 block px-3 text-sm font-semibold">
          {siteConfig.name}
        </Link>
        <SidebarNav />
      </aside>
      <main className="flex-1 px-6">{children}</main>
    </div>
  );
}
