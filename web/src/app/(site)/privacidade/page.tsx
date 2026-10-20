import type { Metadata } from "next";
import { DocumentPage } from "@/components/site/document-page";

export const metadata: Metadata = { title: "Política de privacidade", description: "Rascunho da política de privacidade do OdontoAgent." };

export default function PrivacyPage() {
  return (
    <DocumentPage eyebrow="Legal" title="Política de privacidade" draft>
      <section>
        <h2>Papéis no tratamento</h2>
        <p>A clínica é a controladora dos dados dos seus pacientes. O OdontoAgent atua como operador, tratando os dados conforme as instruções da clínica.</p>
      </section>
      <section>
        <h2>Dados tratados</h2>
        <ul>
          <li>Mensagens de texto e transcrições de áudio enviadas pelos pacientes.</li>
          <li>Nome e número de telefone informados na conversa.</li>
          <li>Informações de agendamento (data, horário e motivo da consulta).</li>
        </ul>
      </section>
      <section>
        <h2>Compartilhamento com operadores</h2>
        <p>Para funcionar, o serviço utiliza um provedor de inteligência artificial (que processa as mensagens para gerar respostas), a conexão com o WhatsApp, a hospedagem do servidor e, quando ativado, o Google Agenda.</p>
      </section>
      <section>
        <h2>Bases legais e direitos</h2>
        <p>O tratamento observa a LGPD (Lei nº 13.709/2018), incluindo as regras para dados pessoais sensíveis de saúde (art. 11). Os titulares podem exercer os direitos previstos no art. 18 por meio da clínica.</p>
      </section>
      <section>
        <h2>Retenção e contato</h2>
        <p>Prazos de retenção, encarregado de dados e canal de contato serão definidos e publicados na versão aprovada deste documento.</p>
      </section>
    </DocumentPage>
  );
}
