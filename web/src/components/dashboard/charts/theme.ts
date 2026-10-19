import type { ConversationStatus } from "@/types/domain";

/**
 * Tema único dos gráficos (Recharts). Cores dos tokens da marca; nunca use cores soltas.
 * Séries: no máximo 3 por gráfico. Status sempre acompanhados de legenda textual.
 */
export const chartColors = {
  primary: "#1D4ED8", // brand-600 — série principal (conversas)
  secondary: "#16856B", // success-700 — agendamentos
  tertiary: "#B45309", // warning-700 — encaminhadas para a equipe
  navy: "#102A43",
  grid: "#E2E8F0", // line
  axis: "#64748B", // muted
  muted: "#CBD5E1", // line-strong
  surface: "#FFFFFF",
} as const;

export const statusColors: Record<ConversationStatus, string> = {
  encerrada: "#CBD5E1",
  agente: "#1D4ED8",
  em_atendimento_humano: "#102A43",
  aguardando_equipe: "#B45309",
};

/** Props comuns para eixos — texto 12px, sem linhas de eixo, grade horizontal discreta. */
export const axisProps = {
  tick: { fill: chartColors.axis, fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const;

export const gridProps = {
  stroke: chartColors.grid,
  strokeDasharray: "0",
  vertical: false,
} as const;
