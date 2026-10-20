import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { DocumentPage } from "@/components/site/document-page";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contato e demonstração",
  description: "Fale com a equipe do OdontoAgent e agende uma demonstração para a sua clínica.",
};

export default function ContactPage() {
  const email = siteConfig.contactEmail;
  const subject = encodeURIComponent("Demonstração do OdontoAgent");

  return (
    <DocumentPage
      eyebrow="Contato"
      title="Agende uma demonstração"
      intro="Conte um pouco sobre a sua clínica e a rotina de atendimento. Mostramos o OdontoAgent funcionando e indicamos o plano mais adequado."
    >
      {email ? (
        <section>
          <h2>Fale com a equipe</h2>
          <p>Envie um e-mail com o nome da clínica, a cidade e o número de profissionais. Respondemos com opções de horário para a demonstração.</p>
          <ButtonLink href={`mailto:${email}?subject=${subject}`} size="lg" icon={<Mail />} className="mt-6">
            {email}
          </ButtonLink>
        </section>
      ) : (
        <Alert title="Canal de contato em configuração">
          O endereço de contato comercial ainda não foi publicado neste ambiente. Enquanto isso, você pode explorar a estrutura do painel.
        </Alert>
      )}
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
