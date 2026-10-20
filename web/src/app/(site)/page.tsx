import type { Metadata } from "next";
import { Benefits } from "@/components/site/benefits";
import { DashboardPreview } from "@/components/site/dashboard-preview";
import { DemoSection } from "@/components/site/demo-section";
import { Faq } from "@/components/site/faq";
import { FinalCta } from "@/components/site/final-cta";
import { Hero } from "@/components/site/hero";
import { HowItWorks } from "@/components/site/how-it-works";
import { Pricing } from "@/components/site/pricing";
import { Problem } from "@/components/site/problem";
import { Security } from "@/components/site/security";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} · Atendimento inteligente para clínicas odontológicas` },
  description: siteConfig.description,
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <DemoSection />
      <DashboardPreview />
      <Benefits />
      <Security />
      <Pricing />
      <Faq />
      <FinalCta />
    </>
  );
}
