import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { demoRequestHref, sectionIds } from "@/config/site";
import { HeroPreview } from "./hero-preview";

export function Hero() {
  return (
    <section aria-labelledby="hero-titulo" className="overflow-x-clip bg-surface pt-14 pb-20 sm:pt-20 lg:pt-24 lg:pb-28">
      <div className="container-page grid grid-cols-[minmax(0,1fr)] items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 xl:gap-20">
        <div className="max-w-2xl">
          <p className="eyebrow text-brand">Atendimento inteligente para clínicas</p>
          <h1 id="hero-titulo" className="mt-5 text-display font-semibold text-balance text-navy lg:text-[2.875rem] xl:text-[3.375rem]">
            Enquanto sua clínica está ocupada, o OdontoAgent continua atendendo.
          </h1>
          <p className="mt-6 text-lead text-pretty text-muted">
            Automatize conversas, organize agendamentos e ofereça um atendimento mais ágil aos seus pacientes com um assistente inteligente
            desenvolvido para a rotina odontológica.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={demoRequestHref} size="lg" iconEnd={<ArrowRight />}>
              Agendar demonstração
            </ButtonLink>
            <ButtonLink href={`/#${sectionIds.comoFunciona}`} variant="secondary" size="lg">
              Ver como funciona
            </ButtonLink>
          </div>
          <p className="mt-5 text-sm text-muted">As respostas seguem as informações e os limites definidos pela clínica.</p>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}
