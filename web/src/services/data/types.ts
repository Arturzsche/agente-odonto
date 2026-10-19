import type {
  Appointment,
  AppointmentFilters,
  ClinicSettings,
  Conversation,
  ConversationFilters,
  ConversationSummary,
  DataSourceKind,
  Integration,
  KnowledgeItem,
  Notification,
  Overview,
  Patient,
  PatientFilters,
  PeriodKey,
  Professional,
  Reports,
  TeamMember,
  WithMeta,
} from "@/types/domain";

/**
 * Contrato da camada de dados do painel. Implementado por:
 * - `demo`  → dados fictícios gerados localmente (services/data/demo)
 * - `live`  → API administrativa do backend do agente (services/data/live)
 *
 * Toda leitura devolve `meta.source`, para a interface sinalizar dados demonstrativos.
 * As operações de escrita ficam fora deste contrato nesta versão (ver DESIGN.md → "Operações simuladas").
 */
export interface DataSource {
  readonly kind: DataSourceKind;
  getOverview(period: PeriodKey): Promise<WithMeta<Overview>>;
  listConversations(filters?: ConversationFilters): Promise<WithMeta<ConversationSummary[]>>;
  getConversation(id: string): Promise<WithMeta<Conversation | null>>;
  listAppointments(filters?: AppointmentFilters): Promise<WithMeta<Appointment[]>>;
  listProfessionals(): Promise<WithMeta<Professional[]>>;
  listPatients(filters?: PatientFilters): Promise<WithMeta<Patient[]>>;
  listKnowledge(): Promise<WithMeta<KnowledgeItem[]>>;
  getReports(period: PeriodKey): Promise<WithMeta<Reports>>;
  getIntegrations(): Promise<WithMeta<Integration[]>>;
  getClinicSettings(): Promise<WithMeta<ClinicSettings>>;
  listTeam(): Promise<WithMeta<TeamMember[]>>;
  listNotifications(): Promise<WithMeta<Notification[]>>;
}

/** Erro de acesso a dados com mensagem segura para exibir ao usuário. */
export class DataSourceError extends Error {
  constructor(
    message: string,
    readonly kind: "rede" | "autorizacao" | "indisponivel" | "desconhecido" = "desconhecido",
  ) {
    super(message);
    this.name = "DataSourceError";
  }
}

export const PERIOD_DAYS: Record<PeriodKey, number> = { "7d": 7, "30d": 30, "90d": 90 };

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
};

export function isPeriodKey(value: unknown): value is PeriodKey {
  return value === "7d" || value === "30d" || value === "90d";
}
