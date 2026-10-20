import { getDemoRequestTarget } from "@/lib/server/demo-request-target";
import { normalizeDemoRequest, validateDemoRequest, type DemoRequestResponse } from "@/lib/validation/demo-request";

/**
 * Recebe pedidos de demonstração e os encaminha para o webhook configurado em
 * DEMO_REQUEST_WEBHOOK_URL (somente servidor). Sem essa variável, responde 503:
 * o site nunca finge que um pedido foi enviado.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const MAX_BODY_BYTES = 8 * 1024;
const TIMEOUT_MS = 8000;

/** Limite simples por IP, em memória (por instância do servidor). */
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

const reply = (body: DemoRequestResponse, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return reply({ ok: false, error: "bad_request", message: "Pedido muito grande." }, 413);

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    input = parsed as Record<string, unknown>;
  } catch {
    return reply({ ok: false, error: "bad_request", message: "Formato de pedido inválido." }, 400);
  }

  // Campo-armadilha preenchido = robô. Responde como sucesso e descarta.
  if (typeof input.website === "string" && input.website.trim()) return reply({ ok: true }, 200);

  const data = normalizeDemoRequest(input);
  const fields = validateDemoRequest(data);
  if (Object.keys(fields).length > 0) return reply({ ok: false, error: "invalid", fields }, 400);

  const target = getDemoRequestTarget();
  if (!target) {
    return reply({ ok: false, error: "not_configured", message: "O envio de pedidos ainda não está configurado neste ambiente." }, 503);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return reply({ ok: false, error: "rate_limited", message: "Recebemos muitos pedidos deste endereço. Tente novamente em alguns minutos." }, 429);
  }

  try {
    const response = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "demo_request", receivedAt: new Date().toISOString(), ...data }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
  } catch (error) {
    // Sem dados pessoais no log: apenas o motivo técnico.
    console.error("[demonstracao] falha ao encaminhar pedido:", error instanceof Error ? error.message : "erro desconhecido");
    return reply({ ok: false, error: "delivery_failed", message: "Não conseguimos registrar seu pedido agora. Tente novamente em instantes." }, 502);
  }

  return reply({ ok: true }, 200);
}
