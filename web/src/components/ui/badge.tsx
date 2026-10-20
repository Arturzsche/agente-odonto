import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  neutral: { box: "bg-canvas text-ink-soft ring-line", dot: "bg-faint" },
  brand: { box: "bg-brand-soft text-brand ring-brand-ring", dot: "bg-brand" },
  success: { box: "bg-success-soft text-success-strong ring-success/20", dot: "bg-success" },
  warning: { box: "bg-warning-soft text-warning ring-warning/20", dot: "bg-warning" },
  danger: { box: "bg-danger-soft text-danger ring-danger/20", dot: "bg-danger" },
  navy: { box: "bg-navy text-white ring-navy", dot: "bg-brand-light" },
} as const;

export type BadgeTone = keyof typeof tones;

/**
 * Rótulo curto de status ou categoria. O texto é obrigatório: o significado
 * nunca depende só da cor (o ponto é reforço visual).
 */
export function Badge({ tone = "neutral", dot = false, icon, className, children }: { tone?: BadgeTone; dot?: boolean; icon?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset [&_svg]:size-3.5", tones[tone].box, className)}>
      {dot && <span aria-hidden="true" className={cn("size-1.5 rounded-full", tones[tone].dot)} />}
      {icon}
      {children}
    </span>
  );
}
