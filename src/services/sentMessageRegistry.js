/**
 * Registro em memória das mensagens que o PRÓPRIO sistema (agente ou painel) enviou pelo
 * WhatsApp da clínica.
 *
 * Por que existe: a Evolution também entrega pelo webhook as mensagens que saem do número da
 * clínica ("fromMe"). Parte delas é só o eco do que o agente acabou de mandar pela API; o resto
 * foi digitado pela equipe no celular ou no WhatsApp Web, e isso significa que uma pessoa assumiu
 * a conversa. Para separar uma coisa da outra, o webhookController usa, nesta ordem:
 *   (b) os IDs deste registro, gravados assim que o sendText retorna, ANTES de salvar no banco
 *       (cobre o intervalo entre o envio e o INSERT e as mensagens que não vão para o banco,
 *       como as de fallback);
 *   (a) o ID já salvo no banco (Message.externalId) das mensagens que registramos;
 *   (c) reforço por texto: uma fromMe com texto idêntico ao que o sistema mandou para o mesmo
 *       número nos últimos 2 minutos é tratada como eco (cobre envios cujo ID não voltou,
 *       ex.: timeout na resposta da Evolution).
 * Além disso, as fromMe só são analisadas depois de FROM_ME_PROCESS_DELAY_MS e na fila do
 * paciente, porque o eco pode chegar antes de o sendText retornar.
 *
 * Limitações: o registro vive só na memória deste processo (some ao reiniciar; para as respostas
 * da IA o banco cobre esse caso) e, pela regra (c), uma mensagem da equipe com texto idêntico ao
 * que o agente acabou de enviar ao mesmo número não é reconhecida como da equipe.
 */

/** Por quanto tempo um ID enviado é lembrado (o eco chega em segundos; isto é folga). */
const ID_TTL_MS = 30 * 60 * 1000;
/** Janela do reforço por texto (regra c). */
const TEXT_WINDOW_MS = 2 * 60 * 1000;
/** Limites para o registro não crescer sem controle num processo de longa duração. */
const MAX_IDS = 5000;
const MAX_TEXTS_PER_NUMBER = 20;
const MAX_NUMBERS = 2000;

/** id -> momento do registro (o Map mantém a ordem de inserção: os primeiros são os mais antigos). */
const sentIds = new Map();
/** número -> [{ text, at }] */
const sentTexts = new Map();

/** "5511999999999@s.whatsapp.net" e "5511999999999" representam o mesmo destino. */
const normalizeNumber = (number) =>
  String(number || '')
    .trim()
    .replace(/@s\.whatsapp\.net$/i, '');

const normalizeText = (text) => String(text || '').trim();

function pruneIds(now) {
  for (const [id, at] of sentIds) {
    if (now - at <= ID_TTL_MS && sentIds.size <= MAX_IDS) break;
    sentIds.delete(id);
  }
}

function pruneTexts(now) {
  for (const [number, entries] of sentTexts) {
    const recent = entries.filter((e) => now - e.at <= TEXT_WINDOW_MS);
    if (recent.length) sentTexts.set(number, recent);
    else sentTexts.delete(number);
  }
}

/**
 * Registra o ID (key.id) de uma mensagem enviada pelo sistema. Chamado automaticamente pelo
 * evolutionService.sendText; outras partes que enviarem mensagens por outro caminho (ex.: a API
 * administrativa) devem chamá-lo assim que o envio retornar, antes de gravar no banco.
 * @param {string|null|undefined} id
 */
function registerSentMessageId(id, now = Date.now()) {
  if (!id || typeof id !== 'string') return;
  sentIds.delete(id); // reinsere no fim (mais recente)
  sentIds.set(id, now);
  pruneIds(now);
}

/** Registra o texto enviado a um número (regra c). O evolutionService chama ANTES do envio. */
function registerSentText(number, text, now = Date.now()) {
  const key = normalizeNumber(number);
  const value = normalizeText(text);
  if (!key || !value) return;
  const entries = (sentTexts.get(key) || []).filter((e) => now - e.at <= TEXT_WINDOW_MS);
  entries.push({ text: value, at: now });
  sentTexts.set(key, entries.slice(-MAX_TEXTS_PER_NUMBER));
  if (sentTexts.size > MAX_NUMBERS) pruneTexts(now);
}

/** True se o ID foi enviado pelo sistema recentemente (regra b). */
function isRegisteredSentId(id, now = Date.now()) {
  if (!id) return false;
  const at = sentIds.get(id);
  return at !== undefined && now - at <= ID_TTL_MS;
}

/** True se o sistema enviou exatamente este texto a este número nos últimos 2 minutos (regra c). */
function wasTextRecentlySent(number, text, now = Date.now()) {
  const entries = sentTexts.get(normalizeNumber(number));
  const value = normalizeText(text);
  if (!entries || !value) return false;
  return entries.some((e) => e.text === value && now - e.at <= TEXT_WINDOW_MS);
}

module.exports = {
  registerSentMessageId,
  registerSentText,
  isRegisteredSentId,
  wasTextRecentlySent,
  TEXT_WINDOW_MS,
};
