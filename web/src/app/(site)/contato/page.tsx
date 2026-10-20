import type { Metadata } from "next";
import { connection } from "next/server";
import { DemoRequestForm } from "@/components/site/demo-request-form";
import { DocumentPage } from "@/components/site/document-page";
import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getDemoRequestTarget } from "@/lib/server/demo-request-target";

export const metadata: Metadata = {
  title: "Contato e demonstração",
  description: "Fale com a equipe do OdontoAgent e agende uma demonstração para a sua clínica.",
};

export default async function ContactPage() {
  // Lê a configuração do servidor a cada pedido, não no build.
  await connection();
  const email = siteConfig.contactEmail;

  return (
    <DocumentPage
      eyebrow="Contato"
      title="Agende uma demonstração"
      intro="Conte um pouco sobre a sua clínica e a rotina de atendimento. Mostramos o OdontoAgent funcionando e indicamos o plano mais adequado."
    >
      <section id="formulario" className="scroll-mt-24" aria-labelledby="formulario-titulo">
        <h2 id="formulario-titulo">Solicite uma demonstração</h2>
        <p>Campos marcados como opcionais podem ficar em branco.</p>
        <div className="mt-6">
          <DemoRequestForm configured={getDemoRequestTarget() !== null} contactEmail={email} />
        </div>
        {email && (
          <p className="mt-6">
            Prefere e-mail? Escreva para <a href={`mailto:${email}`}>{email}</a>.
          </p>
        )}
      </section>
      <section>
        <h2>Enquanto isso</h2>
        <p>Veja como o produto organiza o atendimento e o painel da clínica.</p>
        <ButtonLink href="/dashboard" variant="secondary" className="mt-5">
          Explorar o painel
        </ButtonLink>
      </section>
    </DocumentPage>
  );
}
