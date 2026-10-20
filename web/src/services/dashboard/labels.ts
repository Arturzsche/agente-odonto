/** Rótulos e tons de exibição dos estados do painel (seguro para o navegador). */

import type { BadgeTone } from "@/components/ui/badge";
import type { AppointmentStatus, ContactReason, ConversationStatus, KnowledgeCategory } from "./types";

export const conversationStatus: Record<ConversationStatus, { label: string; tone: BadgeTone; description: string }> = {
  agente: { label: "Com o agente", tone: "brand", description: "O assistente está conduzindo a conversa." },
  aguardando: { label: "Aguardando equipe", tone: "warning", description: "Encaminhada para a equipe e ainda sem responsável." },
  equipe: { label: "Com a equipe", tone: "success", description: "Uma pessoa da equipe assumiu a conversa." },
  encerrada: { label: "Encerrada", tone: "neutral", description: "Atendimento concluído." },
};

export const appointmentStatus: Record<AppointmentStatus, { label: string; tone: BadgeTone }> = {
  agendada: { label: "Agendada", tone: "brand" },
  confirmada: { label: "Confirmada", tone: "success" },
  concluida: { label: "Concluída", tone: "neutral" },
  cancelada: { label: "Cancelada", tone: "danger" },
  faltou: { label: "Não compareceu", tone: "warning" },
};

export const contactReason: Record<ContactReason, string> = {
  agendamento: "Agendamento",
  duvida: "Dúvida administrativa",
  remarcacao: "Remarcação ou cancelamento",
  dor: "Dor ou urgência",
  outros: "Outros assuntos",
};

export const knowledgeCategory: Record<KnowledgeCategory, string> = {
  horarios: "Horários",
  localizacao: "Endereço e acesso",
  valores: "Valores e pagamento",
  convenios: "Convênios",
  orientacoes: "Orientações administrativas",
  politicas: "Políticas da clínica",
};
