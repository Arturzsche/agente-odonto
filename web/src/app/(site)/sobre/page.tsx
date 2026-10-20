import type { Metadata } from "next";
import { DocumentPage } from "@/components/site/document-page";

export const metadata: Metadata = {
  title: "Sobre",
  description: "O que é o OdontoAgent e os princípios que orientam o produto.",
};

export default function AboutPage() {
  return (
    <DocumentPage
      eyebrow="Sobre"
      title="Um assistente que apoia a equipe da clínica"
      intro="O OdontoAgent automatiza a parte repetitiva do atendimento por WhatsApp para que a equipe dedique mais atenção a quem está na clínica."
    >
      <section>
        <h2>O que o produto faz</h2>
        <p>Responde dúvidas administrativas com as informações aprovadas pela clínica, coleta dados iniciais, entende áudios e apoia o agendamento quando a agenda está integrada.</p>
      </section>
      <section>
        <h2>Nossos princípios</h2>
        <ul>
          <li>Apoiar a equipe, não substituí-la.</li>
          <li>Não diagnosticar nem indicar tratamentos: isso cabe ao cirurgião-dentista.</li>
          <li>Ser transparentes sobre o que está pronto e o que está em desenvolvimento.</li>
          <li>Tratar dados de saúde com o cuidado que eles exigem.</li>
        </ul>
      </section>
    </DocumentPage>
  );
}
