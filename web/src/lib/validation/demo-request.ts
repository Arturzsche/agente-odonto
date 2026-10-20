/**
 * Validação do pedido de demonstração, compartilhada entre o formulário (cliente)
 * e a rota /api/demonstracao (servidor). O servidor sempre revalida.
 */

export interface DemoRequest {
  name: string;
  clinic: string;
  email: string;
  whatsapp: string;
  message: string;
}

export type DemoRequestField = keyof DemoRequest;
export type DemoRequestErrors = Partial<Record<DemoRequestField, string>>;

export const demoRequestLimits = { name: 80, clinic: 120, email: 160, whatsapp: 20, message: 1000 } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Normaliza qualquer entrada (FormData convertido, JSON) para o formato esperado. */
export function normalizeDemoRequest(input: Record<string, unknown>): DemoRequest {
  return {
    name: text(input.name).replace(/\s+/g, " "),
    clinic: text(input.clinic).replace(/\s+/g, " "),
    email: text(input.email).toLowerCase(),
    whatsapp: text(input.whatsapp),
    message: text(input.message),
  };
}

export function validateDemoRequest(data: DemoRequest): DemoRequestErrors {
  const errors: DemoRequestErrors = {};

  if (data.name.length < 2) errors.name = "Informe seu nome.";
  else if (data.name.length > demoRequestLimits.name) errors.name = `Use no máximo ${demoRequestLimits.name} caracteres.`;

  if (data.clinic.length < 2) errors.clinic = "Informe o nome da clínica.";
  else if (data.clinic.length > demoRequestLimits.clinic) errors.clinic = `Use no máximo ${demoRequestLimits.clinic} caracteres.`;

  if (!data.email) errors.email = "Informe seu e-mail profissional.";
  else if (data.email.length > demoRequestLimits.email || !EMAIL.test(data.email)) errors.email = "Informe um e-mail válido, como nome@suaclinica.com.br.";

  if (data.whatsapp) {
    const digits = data.whatsapp.replace(/\D/g, "");
    if (!/^[\d\s()+-]+$/.test(data.whatsapp) || digits.length < 10 || digits.length > 13) errors.whatsapp = "Informe o número com DDD, como (11) 91234-5678.";
  }

  if (data.message.length > demoRequestLimits.message) errors.message = `Use no máximo ${demoRequestLimits.message} caracteres.`;

  return errors;
}

/** Respostas da rota /api/demonstracao. */
export type DemoRequestResponse =
  | { ok: true }
  | { ok: false; error: "invalid"; fields: DemoRequestErrors }
  | { ok: false; error: "not_configured" | "rate_limited" | "delivery_failed" | "bad_request"; message: string };
