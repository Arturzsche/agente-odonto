import { CalendarClock, ClipboardList, Inbox, MessageSquareText, Mic, ShieldAlert } from "lucide-react";
import { sectionIds } from "@/config/site";
import { Section, SectionHeading } from "./section";

const problems = [
  {
    title: "Mensagens acumuladas",
    text: "Pacientes aguardam resposta enquanto a recepção atende quem está na clínica, confirma consultas e resolve imprevistos.",
  },
  {
    title: "Oportunidades perdidas",
    text: "Quem escreve à noite ou no fim de semana pode desistir antes de receber uma resposta no dia seguinte.",
  },
  {
    title: "Conversas desorganizadas",
    text: "Pedidos, horários e informações ficam espalhados entre conversas, e fica difícil saber o que ainda precisa de retorno.",
  },
];

const capabilities = [
  { icon: MessageSquareText, title: "Responde dúvidas administrativas", text: "Horários, valores da avaliação e orientações, a partir das informações aprovadas pela clínica." },
  { icon: ClipboardList, title: "Coleta as informações iniciais", text: "Nome, motivo do contato e preferência de horário, antes de a equipe precisar intervir." },
  { icon: CalendarClock, title: "Apoia o agendamento", text: "Consulta horários livres e registra a consulta após a confirmação do paciente, quando integrado à agenda." },
  { icon: Mic, title: "Entende mensagens de áudio", text: "Áudios são transcritos para que o atendimento continue normalmente." },
  { icon: ShieldAlert, title: "Sinaliza relatos urgentes", text: "Dor intensa, inchaço ou sangramento são marcados com prioridade para a equipe." },
  { icon: Inbox, title: "Mantém o histórico", text: "Cada atendimento guarda o contexto da conversa para a próxima resposta." },
];

export function Problem() {
  return (
    <Section labelledBy="problema-titulo" tone="canvas">
      <div className="grid gap-12 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-20">
        <SectionHeading id="problema-titulo" eyebrow="O desafio" title="Sua equipe não deveria precisar escolher entre responder e cuidar de quem já chegou." />
        <ol className="divide-y divide-line border-y border-line">
          {problems.map((problem, index) => (
            <li key={problem.title} className="grid grid-cols-[3rem_1fr] gap-4 py-7">
              <span className="tabular pt-0.5 text-sm font-semibold text-brand" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-navy">{problem.title}</h3>
                <p className="mt-1.5 text-muted">{problem.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div id={sectionIds.recursos} className="mt-24 scroll-mt-24 border-t border-line pt-20">
        <div className="max-w-2xl">
          <p className="eyebrow text-brand">Recursos</p>
          <h3 className="mt-4 text-title font-semibold text-balance text-navy">Menos tarefas repetitivas. Mais organização para a sua equipe.</h3>
          <p className="mt-4 text-muted">O agente cuida da parte repetitiva do atendimento, dentro dos limites configurados pela clínica, e deixa para a equipe o que precisa de uma pessoa.</p>
        </div>
        <ul className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-navy shadow-xs" aria-hidden="true">
                <Icon className="size-4.5" />
              </span>
              <div>
                <h4 className="font-semibold text-navy">{title}</h4>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
