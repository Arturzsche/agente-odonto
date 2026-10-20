import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { siteConfig } from "@/config/site";

/** Ponto de entrada provisório. A landing page é construída numa etapa posterior. */
export default function HomePage() {
  return (
    <main className="container-page flex min-h-dvh flex-col justify-center py-16">
      <Logo size="lg" />
      <p className="eyebrow mt-10 text-muted">Em construção</p>
      <p className="mt-3 max-w-prose text-lead text-muted">{siteConfig.description}</p>
      <ButtonLink href="/dashboard" variant="secondary" className="mt-8 self-start">
        Ver a estrutura do painel
      </ButtonLink>
    </main>
  );
}
