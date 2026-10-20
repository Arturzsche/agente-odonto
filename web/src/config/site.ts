import { getSiteUrl } from "@/lib/env";

export const siteConfig = {
  name: "OdontoAgent",
  description:
    "Assistente inteligente para clínicas odontológicas: atendimento organizado, respostas administrativas e apoio ao agendamento.",
  url: getSiteUrl(),
  locale: "pt-BR",
} as const;
