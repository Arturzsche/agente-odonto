import { ButtonLink } from "@/components/ui/button";

/** Aviso padrão para rotas reservadas que ainda não foram implementadas. */
export function UnderConstruction({ title, description, backHref, backLabel }: { title: string; description: string; backHref?: string; backLabel?: string }) {
  return (
    <section className="mx-auto max-w-xl py-16 text-center">
      <p className="eyebrow text-muted">Em construção</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-navy">{title}</h1>
      <p className="mt-3 text-muted">{description}</p>
      {backHref && backLabel && (
        <ButtonLink href={backHref} variant="secondary" size="sm" className="mt-6">
          {backLabel}
        </ButtonLink>
      )}
    </section>
  );
}
