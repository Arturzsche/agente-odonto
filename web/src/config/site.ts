import { getContactEmail, getSiteUrl } from "@/lib/env";

export const siteConfig = {
  name: "OdontoAgent",
  description:
    "Assistente inteligente para clínicas odontológicas: atendimento organizado, respostas administrativas e apoio ao agendamento.",
  url: getSiteUrl(),
  locale: "pt-BR",
  /** E-mail comercial público. null enquanto não for configurado (NEXT_PUBLIC_CONTACT_EMAIL). */
  contactEmail: getContactEmail(),
} as const;

/** Âncoras das seções da landing page. */
export const sectionIds = {
  recursos: "recursos",
  comoFunciona: "como-funciona",
  demonstracao: "demonstracao",
  dashboard: "dashboard",
  beneficios: "beneficios",
  seguranca: "seguranca",
  precos: "precos",
  faq: "perguntas-frequentes",
} as const;

/** Destino de todos os CTAs "Agendar demonstração". */
export const demoRequestHref = "/contato#formulario";

export const siteNav = [
  { label: "Recursos", href: `/#${sectionIds.recursos}` },
  { label: "Como funciona", href: `/#${sectionIds.comoFunciona}` },
  { label: "Benefícios", href: `/#${sectionIds.beneficios}` },
  { label: "Dashboard", href: `/#${sectionIds.dashboard}` },
  { label: "Preços", href: `/#${sectionIds.precos}` },
] as const;

export const footerNav = [
  {
    title: "Produto",
    links: [
      { label: "Recursos", href: `/#${sectionIds.recursos}` },
      { label: "Como funciona", href: `/#${sectionIds.comoFunciona}` },
      { label: "Dashboard", href: `/#${sectionIds.dashboard}` },
      { label: "Preços", href: `/#${sectionIds.precos}` },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Sobre o OdontoAgent", href: "/sobre" },
      { label: "Contato", href: "/contato" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { label: "Perguntas frequentes", href: `/#${sectionIds.faq}` },
      { label: "Segurança e privacidade", href: `/#${sectionIds.seguranca}` },
      { label: "Explorar o painel", href: "/dashboard" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Termos de uso", href: "/termos" },
      { label: "Política de privacidade", href: "/privacidade" },
    ],
  },
] as const;
