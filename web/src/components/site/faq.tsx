import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { sectionIds } from "@/config/site";
import { Section, SectionHeading } from "./section";

const questions: AccordionItem[] = [
  {
    id: "o-que-e",
    title: "O que é o OdontoAgent?",
    content:
      "Um assistente de atendimento para clínicas odontológicas. Ele responde dúvidas administrativas pelo WhatsApp, coleta informações iniciais e apoia o agendamento, seguindo as regras definidas pela clínica.",
  },
  {
    id: "fora-do-horario",
    title: "O agente funciona fora do horário comercial?",
    content:
      "Sim, enquanto o servidor do agente estiver em funcionamento. A clínica decide o que ele pode responder nesses horários; o que depender da equipe fica registrado para o próximo expediente.",
  },
  {
    id: "whatsapp",
    title: "Como é a integração com o WhatsApp?",
    content:
      "O agente se conecta ao número de WhatsApp da clínica por meio da Evolution API, configurada na implantação. Essa conexão usa o WhatsApp Web e não é a API oficial do WhatsApp Business; avaliamos com a clínica qual opção faz sentido para o seu caso.",
  },
  {
    id: "agendamentos",
    title: "Como funcionam os agendamentos?",
    content:
      "Com o Google Agenda integrado, o agente consulta horários livres, oferece opções e registra a consulta depois da confirmação do paciente, sem reservar o mesmo horário duas vezes. Sem a integração, ele não confirma horários.",
  },
  {
    id: "humano",
    title: "O agente substitui a recepção? Posso falar com uma pessoa?",
    content:
      "Não substitui. Ele assume as tarefas repetitivas para a equipe ter mais tempo com os pacientes. As conversas acontecem no WhatsApp da clínica, então a equipe pode responder a qualquer momento. O encaminhamento automático com pausa do agente está em desenvolvimento.",
  },
  {
    id: "seguranca",
    title: "Como os dados dos pacientes são tratados?",
    content:
      "As credenciais ficam só no servidor e as mensagens são processadas por um provedor externo de IA para gerar as respostas. Base legal, contratos, retenção e perfis de acesso são definidos com a clínica antes do uso com pacientes reais.",
  },
  {
    id: "personalizar",
    title: "Posso personalizar as respostas?",
    content:
      "Sim. Horários, serviços, valores da avaliação e orientações são definidos com a clínica na configuração do agente. O editor dessas informações no painel está em desenvolvimento.",
  },
  {
    id: "requisitos",
    title: "O que é preciso para começar?",
    content:
      "Um número de WhatsApp para a clínica, um servidor para o agente, uma conta no provedor de IA e as informações que o agente pode usar nas respostas. O Google Agenda é opcional, para os agendamentos.",
  },
];

export function Faq() {
  return (
    <Section id={sectionIds.faq} labelledBy="faq-titulo" tone="canvas">
      <div className="grid gap-12 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-20">
        <SectionHeading id="faq-titulo" eyebrow="Perguntas frequentes" title="Dúvidas comuns, respostas diretas." />
        <Accordion items={questions} />
      </div>
    </Section>
  );
}
