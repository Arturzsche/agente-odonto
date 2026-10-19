import Link from "next/link";
import { Logo } from "@/components/ui/logo";

/** ESBOÇO — substituído na Fase 3 (navbar completa com menu mobile). */
export function Navbar() {
  return (
    <header className="sticky top-0 z-40 h-[72px] border-b border-line bg-surface">
      <div className="container-page flex h-full items-center">
        <Link href="/" aria-label="OdontoAgent — página inicial">
          <Logo />
        </Link>
      </div>
    </header>
  );
}
