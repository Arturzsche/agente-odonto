import { CalendarRange, Clock3, Eye, FolderKanban } from "lucide-react";
import { sectionIds } from "@/config/site";
import { Section, SectionHeading } from "./section";

const benefits = [
  {
    icon: Clock3,
    title: "Atendimento contínuo",
    text: "Dúvidas administrativas recebem resposta também fora do horário da equipe, conforme o que a clínica configurar.",
  },
  {
    icon: FolderKanban,
    title: "Conversas organizadas",
    text: "Cada contato tem histórico e situação claros, e fica mais fácil ver o que ainda precisa de retorno.",
  },
  {
    icon: CalendarRange,
    title: "Apoio aos agendamentos",
    text: "O agente coleta a preferência do paciente e oferece horários livres quando a agenda da clínica está integrada.",
  },
  {
    icon: Eye,
    title: "Visibilidade operacional",
    text: "Indicadores de volume, encaminhamentos e agendamentos ajudam a gestão a entender a rotina do atendimento.",
  },
];

export function Benefits() {
  return (
    <Section id={sectionIds.beneficios} labelledBy="beneficios-titulo" tone="canvas">
      <SectionHeading id="beneficios-titulo" eyebrow="Benefícios" title="Tecnologia que simplifica a rotina da clínica." />
      <ul className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 [&>li]:bg-surface">
        {benefits.map(({ icon: Icon, title, text }) => (
          <li key={title} className="p-7 sm:p-9">
            <Icon className="size-5 text-brand" aria-hidden="true" />
            <h3 className="mt-5 text-lg font-semibold text-navy">{title}</h3>
            <p className="mt-2 max-w-sm text-muted">{text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
