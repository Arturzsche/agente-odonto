import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { footerNav, siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-page grid gap-12 py-14 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm text-muted">{siteConfig.description}</p>
        </div>
        <nav aria-label="Rodapé" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {footerNav.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-navy">{group.title}</h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="rounded-xs text-sm text-muted transition-colors hover:text-navy focus-ring">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
          <p>As prévias deste site usam dados fictícios.</p>
        </div>
      </div>
    </footer>
  );
}
