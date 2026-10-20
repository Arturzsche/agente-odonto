/**
 * Planos comerciais (configuráveis). Preços ainda não definidos: `price: null`
 * exibe "Sob proposta" e o CTA "Solicitar proposta". Não preencha valores sem
 * aprovação comercial.
 */

export type FeatureStatus = "disponivel" | "requer-integracao" | "em-desenvolvimento";

export const featureStatusLabel: Record<FeatureStatus, string> = {
  disponivel: "Disponível",
  "requer-integracao": "Requer integração",
  "em-desenvolvimento": "Em desenvolvimento",
};

export interface PlanFeature {
  label: string;
  status: FeatureStatus;
}

export interface Plan {
  id: string;
  name: string;
  audience: string;
  /** Mensalidade em reais. null = sob proposta. */
  price: number | null;
  features: PlanFeature[];
  limits: string;
  contracting: string;
  cta: string;
}

export const plans: Plan[] = [
  {
    id: "essencial",
    name: "Essencial",
    audience: "Consultórios com um número de WhatsApp e agenda única.",
    price: null,
    features: [
      { label: "Atendimento no WhatsApp da clínica", status: "requer-integracao" },
      { label: "Respostas a dúvidas administrativas", status: "disponivel" },
      { label: "Entendimento de mensagens de áudio", status: "disponivel" },
      { label: "Apoio ao agendamento com Google Agenda", status: "requer-integracao" },
      { label: "Painel de conversas e agendamentos", status: "em-desenvolvimento" },
    ],
    limits: "Volume mensal de conversas definido na proposta.",
    contracting: "Proposta após uma conversa sobre a rotina da clínica.",
    cta: "Solicitar proposta",
  },
  {
    id: "profissional",
    name: "Profissional",
    audience: "Clínicas com vários profissionais e maior volume de mensagens.",
    price: null,
    features: [
      { label: "Tudo do Essencial", status: "disponivel" },
      { label: "Sinalização de relatos urgentes", status: "disponivel" },
      { label: "Encaminhamento de conversas para a equipe", status: "em-desenvolvimento" },
      { label: "Relatórios operacionais", status: "em-desenvolvimento" },
    ],
    limits: "Volume mensal de conversas definido na proposta.",
    contracting: "Proposta após uma conversa sobre a rotina da clínica.",
    cta: "Solicitar proposta",
  },
  {
    id: "expansao",
    name: "Clínicas em expansão",
    audience: "Grupos com mais de uma unidade ou necessidades específicas.",
    price: null,
    features: [
      { label: "Tudo do Profissional", status: "disponivel" },
      { label: "Várias unidades no mesmo painel", status: "em-desenvolvimento" },
      { label: "Perfis de acesso por função", status: "em-desenvolvimento" },
    ],
    limits: "Unidades e números de WhatsApp definidos na proposta.",
    contracting: "Planejamento conjunto dos recursos em desenvolvimento.",
    cta: "Consultar disponibilidade",
  },
];
