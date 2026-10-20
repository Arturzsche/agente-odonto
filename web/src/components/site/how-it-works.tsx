import { CalendarCheck2, MessageCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { sectionIds } from "@/config/site";
import { Section, SectionHeading } from "./section";

const steps = [
  {
    icon: MessageCircle,
    title: "O paciente entra em contato",
    text: "A mensagem chega pelo WhatsApp da clínica, a qualquer hora — por texto ou por áudio.",
    detail: <span className="rounded-lg rounded-tl-xs border border-line bg-surface px-3 py-2 text-[0.8125rem] text-ink shadow-xs">Queria marcar uma avaliação</span>,
  },
  {
    icon: Sparkles,
    title: "O agente entende a solicitação",
    text: "Identifica o que o paciente precisa, responde com as informações autorizadas pela clínica e coleta os dados necessários.",
    detail: (
      <span className="flex flex-wrap gap-1.5">
        <Badge tone="brand">Intenção: agendamento</Badge>
        <Badge>Período: manhã</Badge>
      </span>
    ),
  },
  {
    icon: CalendarCheck2,
    title: "O próximo passo é organizado",
    text: "Com a agenda integrada, consulta horários e registra a consulta. O que precisa de uma pessoa é direcionado à equipe da clínica.",
    detail: (
      <span className="flex flex-wrap gap-1.5">
        <Badge tone="success" dot>
          Agendado
        </Badge>
        <Badge tone="warning" dot>
          Para a equipe
        </Badge>
      </span>
    ),
  },
];

export function HowItWorks() {
  return (
    <Section id={sectionIds.comoFunciona} labelledBy="como-funciona-titulo">
      <SectionHeading
        id="como-funciona-titulo"
        eyebrow="Como funciona"
        title="Três etapas, da primeira mensagem ao próximo passo."
        description="O fluxo segue as regras definidas pela clínica, e as conversas continuam no WhatsApp da clínica, ao alcance da equipe."
      />
      <ol className="relative mt-14 grid gap-10 lg:mt-16 lg:grid-cols-3 lg:gap-8">
        {/* Linha que conecta as etapas */}
        <span aria-hidden="true" className="absolute top-5 bottom-5 left-5 w-px bg-line lg:top-5 lg:right-[16%] lg:bottom-auto lg:left-[16%] lg:h-px lg:w-auto" />
        {steps.map(({ icon: Icon, title, text, detail }, index) => (
          <li key={title} className="relative grid grid-cols-[2.5rem_1fr] gap-5 lg:grid-cols-1 lg:gap-6">
            <span className="relative flex size-10 items-center justify-center rounded-full border border-line bg-surface text-navy shadow-xs lg:mx-auto" aria-hidden="true">
              <Icon className="size-4.5" />
            </span>
            <div className="lg:text-center">
              <p className="tabular text-xs font-semibold text-brand">Etapa {String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 text-lg font-semibold text-navy">{title}</h3>
              <p className="mt-2 text-muted lg:mx-auto lg:max-w-xs">{text}</p>
              <div aria-hidden="true" className="mt-5 flex lg:justify-center">
                {detail}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
