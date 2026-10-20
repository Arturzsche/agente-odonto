/**
 * Destino real dos pedidos de demonstração (somente servidor).
 * DEMO_REQUEST_WEBHOOK_URL nunca deve ganhar o prefixo NEXT_PUBLIC_.
 * Só aceita HTTPS (ou HTTP em localhost, para testes locais).
 */
export function getDemoRequestTarget(): URL | null {
  const raw = process.env.DEMO_REQUEST_WEBHOOK_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    return url.protocol === "https:" || (url.protocol === "http:" && local) ? url : null;
  } catch {
    return null;
  }
}
