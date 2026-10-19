import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/cn";
import { Tooltip } from "./tooltip";

/**
 * Selo obrigatório em qualquer tela/trecho que exibe dados fictícios.
 * Ver DESIGN.md → "Honestidade dos dados".
 */
export function DemoBadge({
  className,
  label = "Dados demonstrativos",
  explanation = "Pacientes, conversas e números desta tela são fictícios e servem apenas para demonstrar o produto.",
  tone = "light",
}: {
  className?: string;
  label?: string;
  explanation?: string;
  tone?: "light" | "dark";
}) {
  return (
    <Tooltip content={explanation}>
      <button
        type="button"
        className={cn(
          "inline-flex h-6 cursor-help items-center gap-1.5 rounded-full px-2 text-xs font-medium ring-1 ring-inset",
          tone === "dark" ? "bg-white/10 text-navy-100 ring-white/20" : "bg-warning-50 text-warning-700 ring-warning-700/20",
          className,
        )}
      >
        <FlaskConical className="size-3.5" aria-hidden="true" />
        {label}
      </button>
    </Tooltip>
  );
}
