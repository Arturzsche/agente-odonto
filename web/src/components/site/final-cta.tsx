import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { demoRequestHref } from "@/config/site";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-final-titulo" className="bg-surface py-20 sm:py-24">
      <div className="container-page">
        <div className="rounded-2xl bg-navy px-6 py-14 sm:px-12 sm:py-16 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-16">
          <div className="max-w-2xl">
            <h2 id="cta-final-titulo" className="text-headline font-semibold text-balance text-white">
              Sua clínica pode atender com mais organização a partir de agora.
            </h2>
            <p className="mt-4 text-lead text-on-navy">Descubra como o OdontoAgent pode se adaptar à rotina da sua equipe.</p>
          </div>
          <div className="mt-9 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0">
            <ButtonLink href={demoRequestHref} variant="inverse" size="lg" iconEnd={<ArrowRight />}>
              Agendar demonstração
            </ButtonLink>
            <ButtonLink href="/dashboard" variant="inverse-outline" size="lg">
              Explorar o painel
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
