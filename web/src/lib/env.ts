/**
 * Leitura centralizada de variáveis de ambiente PÚBLICAS (expostas ao navegador).
 * Segredos nunca devem usar o prefixo NEXT_PUBLIC_ nem ser lidos aqui.
 */

const DEFAULT_SITE_URL = "http://localhost:3000";

/** URL pública do site, usada em metadados. Valor inválido cai no padrão local. */
export function getSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  try {
    return new URL(raw || DEFAULT_SITE_URL);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}
