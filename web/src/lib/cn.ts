import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge ciente dos tokens do Design System: sem isto, classes como
 * "text-display" (tamanho) e "text-ink" (cor) seriam tratadas como conflitantes.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "headline", "title", "lead"],
    },
  },
});

/** Junta classes condicionais e resolve conflitos (a última vence). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
