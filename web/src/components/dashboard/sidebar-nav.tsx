"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNav } from "@/config/navigation";

/** Navegação lateral do painel com indicação da página atual. */
export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação do painel">
      <ul className="space-y-1">
        {dashboardNav.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-md px-3 py-2 text-sm ${active ? "bg-neutral-200 font-medium" : "text-neutral-700 hover:bg-neutral-100"}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
