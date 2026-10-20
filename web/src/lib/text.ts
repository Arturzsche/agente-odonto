/** Normaliza texto para busca: minúsculas e sem acentos. */
export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Verdadeiro se todos os termos da busca aparecem em algum dos campos. */
export function matches(query: string, ...fields: string[]) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalize(fields.join(" "));
  return terms.every((term) => haystack.includes(term));
}

/** "1 conversa" / "3 conversas". */
export const plural = (count: number, singular: string, pluralForm = `${singular}s`) => `${count.toLocaleString("pt-BR")} ${count === 1 ? singular : pluralForm}`;
