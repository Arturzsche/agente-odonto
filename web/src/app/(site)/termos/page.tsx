import type { Metadata } from "next";
import { DocumentPage } from "@/components/site/document-page";

export const metadata: Metadata = { title: "Termos de uso", description: "Rascunho dos termos de uso do OdontoAgent." };

export default function TermsPage() {
  return (
    <DocumentPage eyebrow="Legal" title="Termos de uso" draft>
      <section>
        <h2>1. Objeto</h2>
        <p>O OdontoAgent é uma ferramenta de apoio ao atendimento administrativo de clínicas odontológicas por mensagens.</p>
      </section>
      <section>
        <h2>2. Limites do assistente</h2>
        <p>O assistente não realiza diagnósticos, não indica medicamentos e não substitui a avaliação de um profissional de saúde.</p>
      </section>
      <section>
        <h2>3. Responsabilidades da clínica</h2>
        <p>A clínica define as informações que o assistente pode usar, os protocolos de urgência e a forma de informar os pacientes sobre o atendimento automatizado.</p>
      </section>
      <section>
        <h2>4. Disponibilidade e alterações</h2>
        <p>Condições de disponibilidade, suporte e alterações destes termos serão definidas no contrato comercial.</p>
      </section>
    </DocumentPage>
  );
}
