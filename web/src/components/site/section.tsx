import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  white: "bg-surface",
  canvas: "bg-canvas",
  navy: "bg-navy text-white",
} as const;

/** Seção da landing page: âncora, fundo, ritmo vertical e contêiner. */
export function Section({
  id,
  labelledBy,
  tone = "white",
  className,
  children,
}: {
  id?: string;
  labelledBy: string;
  tone?: keyof typeof tones;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("scroll-mt-16 py-20 sm:py-24 lg:py-28", tones[tone], className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}

/** Rótulo + título (h2) + descrição de uma seção. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "left",
  tone = "light",
  className,
}: {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <p className={cn("eyebrow mb-4", dark ? "text-brand-light" : "text-brand")}>{eyebrow}</p>}
      <h2 id={id} className={cn("text-headline font-semibold text-balance", dark ? "text-white" : "text-navy")}>
        {title}
      </h2>
      {description && <p className={cn("mt-5 text-lead text-pretty", dark ? "text-on-navy" : "text-muted")}>{description}</p>}
    </div>
  );
}
