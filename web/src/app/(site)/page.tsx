import Link from "next/link";
import { siteConfig } from "@/config/site";

/** Ponto de entrada provisório. A landing page é construída numa etapa posterior. */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Em construção</p>
      <h1 className="mt-3 text-3xl font-semibold">{siteConfig.name}</h1>
      <p className="mt-3 text-neutral-600">{siteConfig.description}</p>
      <Link href="/dashboard" className="mt-8 text-sm font-medium underline underline-offset-4">
        Ir para o painel (estrutura)
      </Link>
    </main>
  );
}
