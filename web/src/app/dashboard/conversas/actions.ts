"use server";

import type { ChatMessage, ConversationSummary } from "@/types/domain";

/**
 * Ações de conversa no MODO REAL (chamam a API administrativa do agente).
 * No modo demonstrativo a interface NÃO chama estas funções: simula localmente.
 *
 * ESBOÇO: implementação real na Fase 5 (mesmas assinaturas).
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type HandoffAction = "assumir" | "devolver" | "encerrar";

/** Equipe assume (pausa o agente), devolve ao agente ou encerra a conversa. */
export async function updateHandoff(conversationId: string, action: HandoffAction): Promise<ActionResult<ConversationSummary>> {
  void conversationId;
  void action;
  return { ok: false, error: "Ação ainda não disponível nesta versão." };
}

/** Envia uma mensagem da equipe ao paciente pelo WhatsApp da clínica. */
export async function sendStaffMessage(conversationId: string, text: string): Promise<ActionResult<ChatMessage>> {
  void conversationId;
  void text;
  return { ok: false, error: "Ação ainda não disponível nesta versão." };
}
