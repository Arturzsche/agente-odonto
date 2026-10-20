import { cn } from "@/lib/cn";

/** Tons neutros e frios: o avatar identifica, mas não compete com os status. */
const palettes = ["bg-brand-soft text-brand", "bg-canvas text-navy ring-1 ring-inset ring-line", "bg-success-soft text-success-strong", "bg-navy text-white"];

const sizes = { xs: "size-6 text-[0.625rem]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-12 text-base" } as const;

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function paletteFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return palettes[Math.abs(hash) % palettes.length];
}

/**
 * Avatar com iniciais (cor estável por nome). Decorativo por padrão — o nome
 * deve aparecer em texto ao lado; passe `label` quando o avatar estiver sozinho.
 */
export function Avatar({ name, size = "md", label, className }: { name: string; size?: keyof typeof sizes; label?: string; className?: string }) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight select-none", sizes[size], paletteFor(name), className)}
    >
      {initials(name)}
    </span>
  );
}
