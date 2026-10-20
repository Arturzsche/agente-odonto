import { cn } from "@/lib/cn";

/*
 * Símbolo "Encaixe": um "O" aberto e um ponto que ocupa exatamente a abertura —
 * a peça que completa a conexão entre paciente e clínica. Grade de 24 px;
 * traço de 2,6 px para manter a leitura a partir de 16 px.
 */
const RING_PATH = "M18.578 9.606A7 7 0 1 1 14.394 5.422";

const tones = {
  /** Fundo claro: anel navy, ponto azul principal. */
  light: { ring: "var(--color-navy)", dot: "var(--color-brand)", text: "text-navy" },
  /** Fundo escuro: anel branco, ponto azul claro (contraste 7:1 sobre navy). */
  dark: { ring: "var(--color-white)", dot: "var(--color-brand-light)", text: "text-white" },
} as const;

type LogoTone = keyof typeof tones;

/** Apenas o símbolo. Decorativo por padrão; passe `title` quando estiver sozinho e tiver significado. */
export function LogoMark({ tone = "light", className, title }: { tone?: LogoTone; className?: string; title?: string }) {
  const { ring, dot } = tones[tone];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-6 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d={RING_PATH} stroke={ring} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="16.95" cy="7.05" r="2.35" fill={dot} />
    </svg>
  );
}

const sizes = {
  sm: { mark: "size-5", text: "text-[0.9375rem]", gap: "gap-1.5" },
  md: { mark: "size-6", text: "text-[1.0625rem]", gap: "gap-2" },
  lg: { mark: "size-8", text: "text-[1.375rem]", gap: "gap-2.5" },
} as const;

/** Logotipo completo: símbolo + marca tipográfica ("Odonto" semibold + "Agent" regular). */
export function Logo({ tone = "light", size = "md", className }: { tone?: LogoTone; size?: keyof typeof sizes; className?: string }) {
  const s = sizes[size];
  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <LogoMark tone={tone} className={s.mark} />
      <span className={cn("leading-none tracking-[-0.02em]", s.text, tones[tone].text)}>
        <span className="font-semibold">Odonto</span>
        <span className="font-normal">Agent</span>
      </span>
    </span>
  );
}
