import "server-only";
import { isLiveMode } from "@/services/data";

export interface DashboardSession {
  email: string;
  name: string;
  roleLabel: string;
}

export type DashboardAccess = { mode: "demo" } | { mode: "live"; session: DashboardSession };

/**
 * Regra de acesso ao painel:
 * - modo demonstrativo (sem API real configurada): livre, só dados fictícios;
 * - modo real: exige sessão autenticada.
 * ESBOÇO: a autenticação real é implementada na Fase 5 (lib/auth/session.ts).
 */
export async function getDashboardAccess(): Promise<DashboardAccess | null> {
  if (!isLiveMode()) return { mode: "demo" };
  return null;
}
