import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { demoRequestHref, siteConfig, siteNav } from "@/config/site";
import { MobileMenu } from "./mobile-menu";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="container-page flex h-16 items-center gap-8">
        <Link href="/" aria-label={`${siteConfig.name} — página inicial`} className="rounded-sm focus-ring">
          <Logo />
        </Link>

        <nav aria-label="Navegação principal" className="hidden flex-1 lg:block">
          <ul className="flex items-center justify-center gap-7">
            {siteNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="rounded-xs text-sm font-medium text-ink-soft transition-colors hover:text-navy focus-ring">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto hidden items-center gap-5 lg:flex">
          <Link href="/entrar" className="rounded-xs text-sm font-medium text-ink-soft transition-colors hover:text-navy focus-ring">
            Entrar
          </Link>
          <ButtonLink href={demoRequestHref} size="sm">
            Agendar demonstração
          </ButtonLink>
        </div>

        <MobileMenu />
      </div>
    </header>
  );
}
