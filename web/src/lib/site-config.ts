/**
 * Fonte única de verdade para nomes, links e alegações de produto.
 *
 * REGRA: tudo o que a landing page, o FAQ, os preços e a página de integrações afirmam sobre
 * funcionalidades deve vir de `capabilities`, com o status real. Não escreva promessas soltas
 * nos componentes.
 */

export const site = {
  name: "OdontoAgent",
  tagline: "Atendimento inteligente para clínicas odontológicas",
  description:
    "Assistente de atendimento para clínicas odontológicas: responde pacientes no WhatsApp, organiza conversas e apoia o agendamento de consultas.",
  /** URL pública (metadados, Open Graph, sitemap). Configure NEXT_PUBLIC_SITE_URL em produção. */
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  /** E-mail comercial público. Só é exibido quando configurado. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  locale: "pt_BR",
} as const;

/** Âncoras da landing page (ids das seções). */
export const sectionIds = {
  recursos: "recursos",
  comoFunciona: "como-funciona",
  demonstracao: "demonstracao",
  dashboard: "dashboard",
  beneficios: "beneficios",
  seguranca: "seguranca",
  precos: "precos",
  faq: "perguntas-frequentes",
  contato: "agendar-demonstracao",
} as const;

export const mainNav = [
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
      { label: "Solicitar demonstração", href: `/#${sectionIds.contato}` },
    ],
  },
  {
    title: "Recursos",
    links: [
      { label: "Central de ajuda", href: "/ajuda" },
      { label: "Perguntas frequentes", href: `/#${sectionIds.faq}` },
      { label: "Segurança", href: "/seguranca" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Política de privacidade", href: "/privacidade" },
      { label: "Termos de uso", href: "/termos" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Capacidades do produto (status real)                                        */
/* -------------------------------------------------------------------------- */

export type CapabilityStatus =
  /** Funciona hoje, sem depender de terceiros além do que já está descrito. */
  | "disponivel"
  /** Implementado, mas depende de uma integração configurada pela clínica. */
  | "requer-integracao"
  /** Ainda não implementado; só pode ser citado com o rótulo "Em desenvolvimento". */
  | "em-desenvolvimento";

export interface Capability {
  id: string;
  name: string;
  description: string;
  status: CapabilityStatus;
  /** Observação curta exibida junto ao status (ex.: qual integração é necessária). */
  note?: string;
}

export const capabilities = {
  whatsapp: {
    id: "whatsapp",
    name: "Atendimento no WhatsApp",
    description: "Recebe e responde mensagens de pacientes no número de WhatsApp da clínica.",
    status: "requer-integracao",
    note: "Conexão via Evolution API configurada na implantação.",
  },
  respostas: {
    id: "respostas",
    name: "Respostas automáticas",
    description: "Responde dúvidas administrativas com base nas informações aprovadas pela clínica.",
    status: "disponivel",
    note: "Usa um provedor externo de IA para interpretar as mensagens.",
  },
  audio: {
    id: "audio",
    name: "Mensagens de áudio",
    description: "Transcreve áudios enviados pelo paciente para que o atendimento continue normalmente.",
    status: "disponivel",
  },
  agendamento: {
    id: "agendamento",
    name: "Consulta de disponibilidade e agendamento",
    description: "Verifica horários livres e registra a consulta depois que o paciente confirma.",
    status: "requer-integracao",
    note: "Requer integração com o Google Agenda.",
  },
  conflitos: {
    id: "conflitos",
    name: "Proteção contra conflito de horários",
    description: "Impede que dois pacientes reservem o mesmo horário ao mesmo tempo.",
    status: "disponivel",
  },
  urgencia: {
    id: "urgencia",
    name: "Sinalização de relatos urgentes",
    description: "Marca conversas e agendamentos em que o paciente relata dor intensa, inchaço ou sangramento.",
    status: "disponivel",
  },
  encaminhamento: {
    id: "encaminhamento",
    name: "Encaminhamento para a equipe",
    description: "Sinaliza conversas que precisam de uma pessoa e pausa o agente quando a equipe assume.",
    status: "em-desenvolvimento",
  },
  historico: {
    id: "historico",
    name: "Histórico de conversas",
    description: "Guarda o histórico de cada atendimento para dar continuidade ao contexto.",
    status: "disponivel",
  },
  painel: {
    id: "painel",
    name: "Painel administrativo",
    description: "Visão de conversas, agendamentos, pacientes e indicadores operacionais.",
    status: "disponivel",
    note: "Conexão com dados reais requer a configuração da API administrativa.",
  },
  baseConhecimento: {
    id: "baseConhecimento",
    name: "Editor da base de conhecimento",
    description: "Cadastro de horários, serviços e orientações usados pelo agente, direto no painel.",
    status: "em-desenvolvimento",
  },
  lembretes: {
    id: "lembretes",
    name: "Lembretes de consulta",
    description: "Mensagens automáticas de lembrete antes da consulta.",
    status: "em-desenvolvimento",
  },
  multiUnidades: {
    id: "multiUnidades",
    name: "Várias unidades",
    description: "Gestão de mais de uma unidade em um único painel.",
    status: "em-desenvolvimento",
  },
  perfisAcesso: {
    id: "perfisAcesso",
    name: "Perfis de acesso por função",
    description: "Permissões diferentes para gestão, recepção e profissionais.",
    status: "em-desenvolvimento",
  },
} satisfies Record<string, Capability>;

export type CapabilityId = keyof typeof capabilities;

export const capabilityStatusLabel: Record<CapabilityStatus, string> = {
  disponivel: "Disponível",
  "requer-integracao": "Requer integração",
  "em-desenvolvimento": "Em desenvolvimento",
};

/* -------------------------------------------------------------------------- */
/* Planos (sem preços oficiais definidos)                                       */
/* -------------------------------------------------------------------------- */

export interface Plan {
  id: string;
  name: string;
  audience: string;
  /** null = preço ainda não definido publicamente → exibir "Sob proposta". */
  monthlyPrice: number | null;
  capabilities: CapabilityId[];
  limits: string[];
  integrations: string[];
  contracting: string;
  cta: { label: string; href: string };
}

export const plans: Plan[] = [
  {
    id: "essencial",
    name: "Essencial",
    audience: "Para consultórios com um número de WhatsApp e agenda única.",
    monthlyPrice: null,
    capabilities: ["whatsapp", "respostas", "audio", "agendamento", "conflitos", "historico", "painel"],
    limits: ["1 número de WhatsApp", "Volume mensal de conversas definido na proposta"],
    integrations: ["WhatsApp (Evolution API)", "Google Agenda"],
    contracting: "Proposta comercial após conversa sobre a rotina da clínica.",
    cta: { label: "Solicitar proposta", href: `/#${sectionIds.contato}` },
  },
  {
    id: "profissional",
    name: "Profissional",
    audience: "Para clínicas com vários profissionais e maior volume de mensagens.",
    monthlyPrice: null,
    capabilities: [
      "whatsapp",
      "respostas",
      "audio",
      "agendamento",
      "conflitos",
      "urgencia",
      "historico",
      "painel",
      "encaminhamento",
      "baseConhecimento",
    ],
    limits: ["1 número de WhatsApp", "Volume mensal de conversas definido na proposta"],
    integrations: ["WhatsApp (Evolution API)", "Google Agenda"],
    contracting: "Proposta comercial após conversa sobre a rotina da clínica.",
    cta: { label: "Solicitar proposta", href: `/#${sectionIds.contato}` },
  },
  {
    id: "expansao",
    name: "Clínicas em expansão",
    audience: "Para grupos com mais de uma unidade ou necessidades específicas.",
    monthlyPrice: null,
    capabilities: ["whatsapp", "respostas", "agendamento", "painel", "multiUnidades", "perfisAcesso", "lembretes"],
    limits: ["Números de WhatsApp e unidades definidos na proposta"],
    integrations: ["WhatsApp (Evolution API)", "Google Agenda", "Outras integrações sob avaliação técnica"],
    contracting: "Consulte a disponibilidade: recursos em desenvolvimento são planejados com a clínica.",
    cta: { label: "Consultar disponibilidade", href: `/#${sectionIds.contato}` },
  },
];
