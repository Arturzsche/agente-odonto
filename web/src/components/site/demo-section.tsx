import { sectionIds } from "@/config/site";
import { ChatSimulator } from "./chat-simulator/chat-simulator";
import { Section, SectionHeading } from "./section";

const scenarios = [
  { title: "Dor de siso", text: "Acolhe, coleta informações e encaminha para a equipe — sem diagnosticar." },
  { title: "Agendamento", text: "Entende a preferência do paciente e oferece horários disponíveis." },
  { title: "Horário de funcionamento", text: "Responde com as informações cadastradas pela clínica." },
];

/** Simulador interativo com roteiros fixos e dados fictícios — roda inteiro no navegador. */
export function DemoSection() {
  return (
    <Section id={sectionIds.demonstracao} labelledBy="demonstracao-titulo" tone="canvas">
      <div className="grid items-center gap-12 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16">
        <div>
          <SectionHeading
            id="demonstracao-titulo"
            eyebrow="Demonstração"
            title="Veja o atendimento acontecendo, na prática."
            description="Escolha um cenário e acompanhe como o agente conduz a conversa, da primeira mensagem ao próximo passo."
          />
          <ul className="mt-8 space-y-4">
            {scenarios.map((s) => (
              <li key={s.title} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                <p className="text-sm text-ink-soft">
                  <strong className="font-semibold text-ink">{s.title}.</strong> {s.text}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-muted">
            Demonstração com roteiros e dados fictícios. Os pacientes, horários e informações da clínica são exemplos; nenhuma mensagem é enviada e nenhuma
            agenda real é consultada.
          </p>
        </div>

        <ChatSimulator />
      </div>
    </Section>
  );
}
