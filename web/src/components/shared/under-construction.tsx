import Link from "next/link";

/** Aviso padrão para rotas reservadas que ainda não foram implementadas. */
export function UnderConstruction({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <section className="mx-auto max-w-xl py-16 text-center">
      <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Em construção</p>
      <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
      <p className="mt-3 text-neutral-600">{description}</p>
      {backHref && backLabel && (
        <Link href={backHref} className="mt-6 inline-block text-sm font-medium underline underline-offset-4">
          {backLabel}
        </Link>
      )}
    </section>
  );
}
