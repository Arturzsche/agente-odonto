/**
 * Tipos do painel. Espelham o modelo do agente (prisma/schema.prisma na raiz do
 * repositório) e acrescentam o que o painel precisa exibir.
 *
 * Datas e horas são "hora local da clínica" em texto ("2026-10-20" e
 * "2026-10-20T14:05"): ordenáveis como string e sem conversão de fuso no navegador.
 */

export type LocalDate = string;
export type LocalDateTime = string;

/** De onde vêm os dados exibidos. Hoje só existe a fonte demonstrativa. */
export interface DataSource {
  kind: "demo";
  /** "Agora" de referência dos dados, na hora local da clínica. */
  now: LocalDateTime;
  timezone: string;
}

/* ------------------------------------------------------------ Conversas */

/** agente: o assistente conduz · aguardando: encaminhada, ninguém assumiu · equipe: uma pessoa assumiu · encerrada. */
export type ConversationStatus = "agente" | "aguardando" | "equipe" | "encerrada";

export type ContactReason = "agendamento" | "duvida" | "dor" | "remarcacao" | "outros";

export interface Message {
  id: string;
  from: "paciente" | "agente" | "equipe" | "sistema";
  text: string;
  at: LocalDateTime;
  /** Mensagem recebida em áudio e transcrita. */
  audio?: boolean;
}

export interface Conversation {
  id: string;
  patientId: string;
  patientName: string;
  phoneMasked: string;
  status: ConversationStatus;
  reason: ContactReason;
  urgent: boolean;
  /** Motivo do encaminhamento para a equipe, quando houver. */
  handoffReason?: string;
  startedAt: LocalDateTime;
  lastMessageAt: LocalDateTime;
  messages: Message[];
}

/* ------------------------------------------------------------ Agenda */

/** Mesmos estados de AppointmentStatus no agente. */
export type AppointmentStatus = "agendada" | "confirmada" | "concluida" | "cancelada" | "faltou";

export interface Professional {
  id: string;
  name: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  professionalId: string;
  date: LocalDate;
  time: string;
  durationMinutes: number;
  reason: string;
  status: AppointmentStatus;
  emergency: boolean;
  /** Marcada pelo agente (WhatsApp) ou pela equipe. */
  origin: "agente" | "equipe";
}

/* ------------------------------------------------------------ Pacientes */

/** Somente o necessário para a operação de atendimento — sem dados clínicos. */
export interface Patient {
  id: string;
  name: string;
  phoneMasked: string;
  firstContact: LocalDate;
  lastContact: LocalDateTime;
  conversationCount: number;
  nextAppointment: { date: LocalDate; time: string } | null;
}

/* ------------------------------------------------------------ Conhecimento */

export type KnowledgeCategory = "horarios" | "localizacao" | "valores" | "convenios" | "orientacoes" | "politicas";

export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  published: boolean;
  updatedAt: LocalDateTime;
}

/* ------------------------------------------------------------ Indicadores */

/** Volume de um dia. */
export interface DailyStats {
  date: LocalDate;
  conversations: number;
  /** Resolvidas pelo agente, sem precisar da equipe. */
  resolvedByAgent: number;
  /** Encaminhadas para a equipe. */
  handedOff: number;
  appointmentsCreated: number;
  reasons: Record<ContactReason, number>;
  /** Conversas iniciadas por hora do dia (0–23). */
  byHour: number[];
}
