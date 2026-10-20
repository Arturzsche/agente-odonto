import type { ReactNode } from "react";
import { Alert } from "@/components/ui/feedback";

/** Layout de páginas de texto (institucionais e legais). */
export function DocumentPage({ eyebrow, title, intro, draft = false, children }: { eyebrow: string; title: string; intro?: ReactNode; draft?: boolean; children: ReactNode }) {
  return (
    <article className="container-page py-16 sm:py-20">
      <div className="max-w-prose">
        <p className="eyebrow text-brand">{eyebrow}</p>
        <h1 className="mt-4 text-headline font-semibold text-balance text-navy">{title}</h1>
        {intro && <p className="mt-5 text-lead text-muted">{intro}</p>}
        {draft && (
          <Alert tone="warning" title="Rascunho" className="mt-8">
            Este documento ainda não passou por revisão jurídica e não representa uma política aprovada.
          </Alert>
        )}
        <div className="mt-10 space-y-8 text-ink [&>*>h2]:text-xl [&>*>h2]:font-semibold [&>*>h2]:text-navy [&>*>p]:mt-3 [&>*>p]:leading-relaxed [&>*>p]:text-ink-soft [&>*>ul]:mt-3 [&>*>ul]:list-disc [&>*>ul]:pl-5 [&>*>ul]:text-ink-soft [&>*>ul>li]:mt-1.5 [&>*>p_a]:font-medium [&>*>p_a]:text-brand [&>*>p_a]:underline [&>*>p_a]:underline-offset-4">
          {children}
        </div>
      </div>
    </article>
  );
}
