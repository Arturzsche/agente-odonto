import "server-only";
import { DataSourceError, type DataSource } from "../types";

const notReady = async (): Promise<never> => {
  throw new DataSourceError("A conexão com a API administrativa ainda não foi implementada.", "indisponivel");
};

/** Fonte real (API administrativa do agente). Implementação completa em andamento. */
export const liveDataSource: DataSource = {
  kind: "live",
  getOverview: notReady,
  listConversations: notReady,
  getConversation: notReady,
  listAppointments: notReady,
  listProfessionals: notReady,
  listPatients: notReady,
  listKnowledge: notReady,
  getReports: notReady,
  getIntegrations: notReady,
  getClinicSettings: notReady,
  listTeam: notReady,
  listNotifications: notReady,
};
