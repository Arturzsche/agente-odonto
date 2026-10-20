import { Check, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { featureStatusLabel, plans, type Plan } from "@/config/plans";
import { demoRequestHref, sectionIds } from "@/config/site";
import { Section, SectionHeading } from "./section";

const priceFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <li className="flex flex-col rounded-xl border border-line bg-surface p-6 shadow-xs sm:p-7">
      <h3 className="text-lg font-semibold text-navy">{plan.name}</h3>
      <p className="mt-2 min-h-12 text-sm text-muted">{plan.audience}</p>
      <p className="mt-6 text-2xl font-semibold tracking-tight text-navy">
        {plan.price === null ? "Sob proposta" : `${priceFormatter.format(plan.price)}/mês`}
      </p>

      <ul className="mt-6 space-y-3 border-t border-line pt-6">
        {plan.features.map((feature) => (
          <li key={feature.label} className="flex gap-2.5 text-sm text-ink">
            {feature.status === "em-desenvolvimento" ? (
              <CircleDashed className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden="true" />
            ) : (
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            )}
            <span>
              {feature.label}
              {feature.status !== "disponivel" && (
                <Badge tone={feature.status === "em-desenvolvimento" ? "neutral" : "brand"} className="ml-2 h-5 align-middle text-[0.6875rem]">
                  {featureStatusLabel[feature.status]}
                </Badge>
              )}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-6 space-y-3 border-t border-line pt-6 text-sm">
        <div>
          <dt className="font-medium text-ink">Limites</dt>
          <dd className="text-muted">{plan.limits}</dd>
        </div>
        <div>
          <dt className="font-medium text-ink">Contratação</dt>
          <dd className="text-muted">{plan.contracting}</dd>
        </div>
      </dl>

      <div className="mt-auto pt-8">
        <ButtonLink href={demoRequestHref} variant="secondary" fullWidth>
          {plan.cta}
        </ButtonLink>
      </div>
    </li>
  );
}

export function Pricing() {
  return (
    <Section id={sectionIds.precos} labelledBy="precos-titulo">
      <SectionHeading
        id="precos-titulo"
        eyebrow="Preços"
        title="Planos que acompanham o tamanho da sua clínica."
        description="Os valores dependem do volume de conversas e das integrações necessárias. Enviamos uma proposta depois de conhecer a rotina da clínica."
      />
      <ul className="mt-14 grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </ul>
      <p className="mt-8 text-sm text-muted">
        Itens marcados como <span className="font-medium text-ink">Requer integração</span> dependem de serviços configurados na implantação;{" "}
        <span className="font-medium text-ink">Em desenvolvimento</span> indica recursos ainda não disponíveis.
      </p>
    </Section>
  );
}
