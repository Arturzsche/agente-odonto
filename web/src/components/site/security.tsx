import Link from "next/link";
import { sectionIds } from "@/config/site";
import { Section, SectionHeading } from "./section";

/** Somente práticas que o produto efetivamente adota hoje. */
const practices = [
  "Chaves e credenciais ficam apenas no servidor, nunca no navegador.",
  "Cada mensagem recebida é registrada uma única vez, evitando respostas duplicadas.",
  "Proteção contra a reserva do mesmo horário por dois pacientes.",
  "O agente não diagnostica nem indica medicamentos; relatos de urgência são sinalizados.",
];

/** Decisões que dependem da clínica e são definidas na implantação. */
const shared = [
  "Base legal e informação aos pacientes sobre o uso do assistente.",
  "Contrato com o provedor de IA e com os demais serviços utilizados.",
  "Política de retenção e exclusão das conversas.",
  "Quem da equipe pode acessar os dados e com qual perfil.",
  "Protocolo de urgência validado por um cirurgião-dentista responsável.",
];

export function Security() {
  return (
    <Section id={sectionIds.seguranca} labelledBy="seguranca-titulo" tone="navy">
      <div className="grid gap-12 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-20">
        <div>
          <SectionHeading
            id="seguranca-titulo"
            tone="dark"
            eyebrow="Segurança e privacidade"
            title="A confiança dos pacientes também faz parte da experiência."
            description="Dados de saúde são dados sensíveis pela LGPD (Lei nº 13.709/2018). Segurança depende da arquitetura, da configuração e dos processos de cada clínica — por isso dizemos com clareza o que o produto já faz e o que precisa ser definido em conjunto."
          />
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <Link href="/privacidade" className="rounded-xs font-medium text-white underline decoration-navy-soft underline-offset-4 hover:decoration-brand-light focus-ring">
              Política de privacidade
            </Link>
            <Link href="/termos" className="rounded-xs font-medium text-white underline decoration-navy-soft underline-offset-4 hover:decoration-brand-light focus-ring">
              Termos de uso
            </Link>
          </div>
        </div>

        <div className="space-y-10">
          <div className="rounded-xl border border-navy-soft p-6 sm:p-7">
            <p className="text-sm text-on-navy">
              <strong className="font-semibold text-white">Transparência sobre IA:</strong> as mensagens dos pacientes são processadas por um provedor externo de
              inteligência artificial para gerar as respostas. Antes de usar com pacientes reais, a clínica deve avaliar o contrato, a base legal e as
              salvaguardas aplicáveis.
            </p>
          </div>
          <div className="grid gap-10 sm:grid-cols-2">
            <List title="O que o produto já faz" items={practices} />
            <List title="O que definimos com a clínica" items={shared} />
          </div>
          <p className="text-xs text-on-navy">Não apresentamos selos ou certificações: nenhuma auditoria ou certificação foi realizada até o momento.</p>
        </div>
      </div>
    </Section>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm text-on-navy">
            <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-brand-light" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
