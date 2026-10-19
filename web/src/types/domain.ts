/**
 * Modelos de domínio do painel. Os mesmos tipos são produzidos pela fonte demonstrativa
 * (dados fictícios locais) e pela fonte real (API administrativa do agente).
 * Datas são strings ISO 8601 (serializáveis entre Server e Client Components).
 */

export type DataSourceKind = "demo" | "live";

export interface DataMeta {
  source: DataSourceKind;
  /** Momento em que os dados foram gerados/consultados (ISO). */
  generatedAt: string;
}

export interface WithMeta<T> {
  data: T;
  meta: DataMeta;
}

/* ------------------------------- Clínica ------------------------------- */

export interface BusinessHours {
  /** 0 = domingo … 6 = sábado */
  weekday: number;
  opens: string | null; // "08:00" ou null = fechado
  closes: string | null;
}

export interface ClinicSettings {
  id: string;
  name: string;
  timezone: string;
  phoneDisplay: string | null;
  address: string | null;
  businessHours: BusinessHours[];
  agent: {
    name: string;
    /** Atende fora do horário comercial. */
    afterHours: boolean;
    /** Tempo sem mensagens até a conversa virar um novo atendimento. */
    sessionTimeoutHours: number;
    /** Encaminhar automaticamente relatos de urgência para a equipe. */
    escalateUrgent: boolean;
  };
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "gestor" | "recepcao" | "profissional";
  lastAccessAt: string | null;
}

/* ------------------------------- Pacientes ------------------------------ */

export interface Patient {
  id: string;
  name: string;
  /** Sempre mascarado para exibição (minimização de dados). */
  phoneMasked: string;
  firstContactAt: string;
  lastContactAt: string;
  conversationsCount: number;
  appointmentsCount: number;
  nextAppointmentAt: string | null;
}

/* ------------------------------- Conversas ------------------------------ */

export type ConversationStatus =
  /** O agente está conduzindo o atendimento. */
  | "agente"
  /** Precisa de uma pessoa da equipe e ainda não foi assumida. */
  | "aguardando_equipe"
  /** A equipe assumiu; o agente está pausado. */
  | "em_atendimento_humano"
  /** Atendimento encerrado. */
  | "encerrada";

export type ConversationPriority = "normal" | "alta";

export type MessageAuthor = "paciente" | "agente" | "equipe" | "sistema";

export interface ChatMessage {
  id: string;
  author: MessageAuthor;
  text: string;
  sentAt: string;
  /** Mensagem de áudio transcrita. */
  isAudioTranscript?: boolean;
}

export interface ConversationSummary {
  id: string;
  patient: { id: string; name: string; phoneMasked: string };
  channel: "whatsapp";
  status: ConversationStatus;
  priority: ConversationPriority;
  /** Critério que definiu a prioridade (ex.: "Relato de dor intensa"). */
  priorityReason: string | null;
  lastMessagePreview: string;
  lastMessageAt: string;
  startedAt: string;
  messagesCount: number;
  unread: number;
}

export interface Conversation extends ConversationSummary {
  messages: ChatMessage[];
}

/* ----------------------------- Agendamentos ----------------------------- */

export type AppointmentStatus = "agendado" | "confirmado" | "concluido" | "cancelado" | "faltou";

export type AppointmentCategory = "Avaliação inicial" | "Retorno" | "Limpeza" | "Urgência" | "Ortodontia" | "Canal" | "Clareamento";

export interface Appointment {
  id: string;
  patient: { id: string; name: string };
  professional: { id: string; name: string } | null;
  startsAt: string;
  durationMinutes: number;
  category: AppointmentCategory;
  reason: string;
  status: AppointmentStatus;
  isEmergency: boolean;
  source: "agente" | "equipe";
}

/* ------------------------- Base de conhecimento ------------------------- */

export type KnowledgeCategory = "Horários" | "Serviços" | "Pagamentos" | "Orientações" | "Perguntas frequentes" | "Localização";

export interface KnowledgeItem {
  id: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  status: "publicado" | "rascunho";
  updatedAt: string;
  updatedBy: string;
}

/* ----------------------------- Indicadores ------------------------------ */

export type PeriodKey = "7d" | "30d" | "90d";

export interface DailyPoint {
  /** YYYY-MM-DD no fuso da clínica */
  day: string;
  conversations: number;
  appointments: number;
  escalated: number;
}

export interface StatusSlice {
  status: ConversationStatus;
  count: number;
}

export interface Kpi {
  id: "conversas_recebidas" | "aguardando_equipe" | "agendamentos_confirmados" | "intervencao_humana";
  label: string;
  value: number;
  /** Mesmo indicador no período anterior equivalente (para variação). null = sem base. */
  previousValue: number | null;
  /** Explica o que está sendo contado — exibido em tooltip. */
  definition: string;
}

export interface Overview {
  period: PeriodKey;
  kpis: Kpi[];
  daily: DailyPoint[];
  statusBreakdown: StatusSlice[];
  upcomingAppointments: Appointment[];
  attentionConversations: ConversationSummary[];
}

export interface Reports {
  period: PeriodKey;
  daily: DailyPoint[];
  statusBreakdown: StatusSlice[];
  /** Mensagens recebidas por faixa horária (0–23) */
  byHour: { hour: number; conversations: number }[];
  /** Conversas iniciadas fora do horário de atendimento */
  afterHoursShare: number;
  appointmentsByCategory: { category: AppointmentCategory; count: number }[];
  /** Distribuição dos agendamentos por origem */
  appointmentsBySource: { source: Appointment["source"]; count: number }[];
}

/* ----------------------------- Integrações ------------------------------ */

export type IntegrationStatus = "conectado" | "demonstrativo" | "pendente" | "erro";

export interface Integration {
  id: "whatsapp" | "agenda" | "ia" | "banco";
  name: string;
  description: string;
  status: IntegrationStatus;
  /** Detalhe técnico legível (ex.: "Instância clinica · conectada"). */
  detail: string;
  lastCheckedAt: string | null;
  /** Passos ou documentação para configurar, quando pendente. */
  setupHint: string | null;
}

/* -------------------------------- Filtros ------------------------------- */

export interface ConversationFilters {
  q?: string;
  status?: ConversationStatus | "todas";
  priority?: ConversationPriority | "todas";
}

export interface AppointmentFilters {
  from?: string; // YYYY-MM-DD
  to?: string;
  status?: AppointmentStatus | "todos";
  professionalId?: string | "todos";
  q?: string;
}

export interface PatientFilters {
  q?: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  href: string;
  read: boolean;
}
