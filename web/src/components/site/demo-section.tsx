import { Badge } from "@/components/ui/badge";
import { sectionIds } from "@/config/site";
import { Section, SectionHeading } from "./section";

const scenarios = ["Dor de dente", "Agendar avaliação", "Horário de funcionamento"];

/**
 * Espaço reservado para o simulador de chat (próxima etapa). Mostra a moldura
 * final do simulador e deixa claro que a versão interativa ainda está chegando.
 */
export function DemoSection() {
  return (
    <Section id={sectionIds.demonstracao} labelledBy="demonstracao-titulo" tone="canvas">
      <div className="grid items-center gap-12 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16">
        <div>
          <SectionHeading
            id="demonstracao-titulo"
            eyebrow="Demonstração"
            title="Veja o atendimento acontecendo, na prática."
            description="Uma conversa mais organizada, da primeira mensagem à confirmação do próximo passo."
          />
          <ul className="mt-8 space-y-3 text-sm text-ink-soft">
            {scenarios.map((s) => (
              <li key={s} className="flex items-center gap-3">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-md">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <p className="text-sm font-semibold text-ink">Simulador de atendimento</p>
            <Badge tone="warning" dot>
              Em preparação
            </Badge>
          </div>
          <div aria-hidden="true" className="flex gap-2 border-b border-line px-5 py-3">
            {scenarios.map((s, i) => (
              <span key={s} className={i === 0 ? "rounded-md bg-canvas px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-line" : "px-2.5 py-1 text-xs text-muted"}>
                {s}
              </span>
            ))}
          </div>
          <div className="flex min-h-72 flex-col items-center justify-center gap-2 bg-canvas px-6 py-12 text-center">
            <p className="font-medium text-ink">O simulador interativo chega em breve.</p>
            <p className="max-w-sm text-sm text-muted">Você poderá escolher um cenário e acompanhar, passo a passo, como o agente conduz a conversa. Nenhuma mensagem será enviada a pacientes reais.</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
