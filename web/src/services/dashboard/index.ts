/**
 * Ponto único de acesso aos dados do painel. As telas chamam só estas funções.
 *
 * Hoje todas leem a fonte demonstrativa (./demo-data.ts). Para conectar ao agente,
 * basta reimplementar estas funções sobre a API dele, mantendo os tipos.
 */

import "server-only";
import { connection } from "next/server";
import { datePart, nowInTimeZone, timePart } from "@/lib/dates";
import { buildAppointments, buildConversations, buildDailyStats, buildKnowledge, buildPatients, professionals } from "./demo-data";
import type { DataSource } from "./types";

export const CLINIC_TIMEZONE = "America/Sao_Paulo";

/** Lê o "agora" da clínica a cada requisição (as telas nunca são geradas no build). */
export async function getDataSource(): Promise<DataSource> {
  await connection();
  return { kind: "demo", now: nowInTimeZone(CLINIC_TIMEZONE), timezone: CLINIC_TIMEZONE };
}

export async function getConversations(source?: DataSource) {
  source ??= await getDataSource();
  return buildConversations(source.now);
}

export async function getAppointments(source?: DataSource) {
  source ??= await getDataSource();
  return { appointments: buildAppointments(source.now), professionals };
}

export async function getPatients(source?: DataSource) {
  source ??= await getDataSource();
  return buildPatients(source.now, buildConversations(source.now), buildAppointments(source.now));
}

export async function getKnowledgeEntries(source?: DataSource) {
  source ??= await getDataSource();
  return buildKnowledge(source.now);
}

export async function getDailyStats(source?: DataSource) {
  source ??= await getDataSource();
  return buildDailyStats(datePart(source.now), timePart(source.now));
}

/** Índice leve para a busca global do cabeçalho. */
export async function getSearchIndex(source?: DataSource) {
  source ??= await getDataSource();
  const conversations = buildConversations(source.now);
  return {
    conversations: conversations.map((c) => ({ id: c.id, patientName: c.patientName, preview: c.messages.at(-1)?.text ?? "" })),
    patients: buildPatients(source.now, conversations, buildAppointments(source.now)).map((p) => ({ id: p.id, name: p.name })),
  };
}

export type SearchIndex = Awaited<ReturnType<typeof getSearchIndex>>;
