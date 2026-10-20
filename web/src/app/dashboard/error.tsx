"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

/** Falha ao carregar uma tela do painel: explica e permite tentar de novo. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-lg rounded-lg border border-line bg-surface px-6 py-12 text-center shadow-xs">
      <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert className="size-5" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-lg font-semibold text-navy">Não foi possível carregar esta página</h1>
      <p className="mt-2 text-sm text-muted">Ocorreu um erro ao montar os dados da tela. Tente novamente; se o problema continuar, volte à visão geral.</p>
      {error.digest && <p className="tabular mt-3 text-xs text-muted">Código do erro: {error.digest}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button icon={<RotateCcw />} onClick={reset}>
          Tentar novamente
        </Button>
        <ButtonLink href="/dashboard" variant="secondary">
          Ir para a visão geral
        </ButtonLink>
      </div>
    </div>
  );
}
