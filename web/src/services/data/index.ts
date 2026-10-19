import "server-only";
import type { DataSource } from "./types";
import { demoDataSource } from "./demo";

export * from "./types";

/**
 * Indica se o painel está ligado aos dados reais do agente.
 * A fonte real só é usada quando a API administrativa está configurada no servidor.
 * O token NUNCA é exposto ao navegador (sem prefixo NEXT_PUBLIC_).
 */
export function isLiveMode(): boolean {
  return Boolean(process.env.AGENT_ADMIN_API_URL && process.env.AGENT_ADMIN_API_TOKEN);
}

/** Fonte de dados do painel para esta requisição (somente no servidor). */
export async function getDataSource(): Promise<DataSource> {
  if (isLiveMode()) {
    const { liveDataSource } = await import("./live");
    return liveDataSource;
  }
  return demoDataSource;
}
