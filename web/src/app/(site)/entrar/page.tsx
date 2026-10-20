import type { Metadata } from "next";
import { DocumentPage } from "@/components/site/document-page";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <DocumentPage eyebrow="Acesso ao painel" title="Entrar no OdontoAgent">
      <Alert title="O acesso com login ainda não está disponível">
        A autenticação das clínicas será liberada junto com o painel conectado aos dados reais. Nenhuma credencial é solicitada nesta versão.
      </Alert>
      <section>
        <h2>Conheça o painel</h2>
        <p>A estrutura do painel administrativo já pode ser navegada, sem dados de pacientes.</p>
        <ButtonLink href="/dashboard" className="mt-5">
          Explorar o painel
        </ButtonLink>
      </section>
    </DocumentPage>
  );
}
