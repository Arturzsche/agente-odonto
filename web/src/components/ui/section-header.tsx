import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Cabeçalho editorial das seções da landing page.
 * Use `as="h2"` nas seções e `as="h1"` apenas no hero e nas páginas institucionais.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  as: Heading = "h2",
  id,
  tone = "light",
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2";
  id?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <p className={cn("eyebrow mb-4", tone === "dark" ? "text-navy-300" : "text-brand-600")}>{eyebrow}</p>}
      <Heading id={id} className={cn("text-headline font-semibold text-balance", tone === "dark" ? "text-white" : "text-navy-900")}>
        {title}
      </Heading>
      {description && (
        <p className={cn("mt-5 text-lead text-pretty", tone === "dark" ? "text-navy-200" : "text-muted", align === "center" && "mx-auto")}>{description}</p>
      )}
    </div>
  );
}
