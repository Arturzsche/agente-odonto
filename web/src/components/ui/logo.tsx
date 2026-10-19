import { cn } from "@/lib/cn";

/**
 * Símbolo do OdontoAgent: um anel aberto (o "O" de Odonto, a continuidade do atendimento)
 * com um ponto de conexão no lugar da abertura (o agente que mantém a conversa em andamento).
 * Geometria em grade de 32 px; legível a partir de 16 px.
 */
export function LogoMark({ className, tone = "default", title }: { className?: string; tone?: "default" | "inverse"; title?: string }) {
  const tile = tone === "inverse" ? "#FFFFFF" : "#102A43";
  const ring = tone === "inverse" ? "#102A43" : "#FFFFFF";
  return (
    <svg viewBox="0 0 32 32" className={cn("shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <rect width="32" height="32" rx="8" fill={tile} />
      {/* Anel de 300°, aberto no quadrante superior direito */}
      <path d="M23.24 14.06A7.5 7.5 0 1 1 17.94 8.76" fill="none" stroke={ring} strokeWidth="3.2" strokeLinecap="round" />
      {/* Ponto de conexão */}
      <circle cx="22.4" cy="9.6" r="2.35" fill="#16856B" />
    </svg>
  );
}

/** Logotipo completo (símbolo + nome). Use `tone="inverse"` sobre fundos escuros. */
export function Logo({ className, tone = "default", size = "md" }: { className?: string; tone?: "default" | "inverse"; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center", size === "sm" ? "gap-2" : "gap-2.5", className)}>
      <LogoMark tone={tone} className={{ sm: "size-6", md: "size-7", lg: "size-9" }[size]} />
      <span
        className={cn(
          "leading-none tracking-[-0.022em]",
          { sm: "text-[0.9375rem]", md: "text-[1.0625rem]", lg: "text-[1.375rem]" }[size],
          tone === "inverse" ? "text-white" : "text-navy-900",
        )}
      >
        <span className="font-semibold">Odonto</span>
        <span className="font-normal">Agent</span>
      </span>
    </span>
  );
}
