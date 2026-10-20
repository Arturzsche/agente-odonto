import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo, LogoMark } from "@/components/ui/logo";
import { Interactive, Section, Static } from "./showcase";

/**
 * Catálogo INTERNO do Design System. Não faz parte da experiência comercial:
 * - não é indexado;
 * - em produção responde 404, a menos que ENABLE_DESIGN_SYSTEM_PAGE=true.
 * Remover quando deixar de ser necessário (pasta src/app/(internal)/design-system).
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Design System (interno)", robots: { index: false, follow: false } };

const colors: Array<{ token: string; hex: string; use: string; dark?: boolean }> = [
  { token: "navy", hex: "#102A43", use: "Autoridade, títulos, superfícies escuras", dark: true },
  { token: "brand", hex: "#1D4ED8", use: "Ação principal e interação", dark: true },
  { token: "brand-soft", hex: "#EFF6FF", use: "Superfície azul suave" },
  { token: "surface", hex: "#FFFFFF", use: "Cartões, campos, painéis" },
  { token: "canvas", hex: "#F7F9FC", use: "Fundo" },
  { token: "line", hex: "#E2E8F0", use: "Bordas" },
  { token: "muted", hex: "#64748B", use: "Texto secundário (4,8:1)", dark: true },
  { token: "ink", hex: "#172B3A", use: "Texto principal (14:1)", dark: true },
  { token: "success", hex: "#16856B", use: "Estados positivos", dark: true },
  { token: "success-soft", hex: "#E8F7F1", use: "Fundo de sucesso (texto: success-strong)" },
];

const type: Array<{ name: string; className: string; spec: string }> = [
  { name: "Display", className: "text-display font-semibold text-navy", spec: "40→64 px · 600 · 1.05 · −3%" },
  { name: "Headline", className: "text-headline font-semibold text-navy", spec: "32→44 px · 600 · 1.12 · −2,5%" },
  { name: "Title", className: "text-title font-semibold text-navy", spec: "20→24 px · 600 · 1.3" },
  { name: "Lead", className: "text-lead text-muted", spec: "18 px · 400 · 1.7" },
  { name: "Body", className: "text-base text-ink", spec: "16 px · 400 · 1.625" },
  { name: "Interface", className: "text-sm text-ink", spec: "14 px · 400/500 · 1.57 (painel)" },
  { name: "Caption", className: "text-xs text-muted", spec: "12 px · 400/500" },
];

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DESIGN_SYSTEM_PAGE !== "true") notFound();

  return (
    <main className="bg-canvas pb-24">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-6">
          <Logo />
          <p className="text-sm text-muted">Design System · página interna, fora da experiência comercial</p>
        </div>
      </header>

      <div className="container-page space-y-16 pt-12">
        <Section title="Marca" description="Símbolo “Encaixe”: um O aberto e o ponto que completa a conexão. Funciona de 16 px em diante, em fundo claro e escuro.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-8 rounded-lg border border-line bg-surface p-8">
              <Logo size="lg" />
              <div className="flex items-end gap-5">
                {["size-4", "size-5", "size-6", "size-8", "size-12"].map((s) => (
                  <LogoMark key={s} className={s} />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-8 rounded-lg bg-navy p-8">
              <Logo size="lg" tone="dark" />
              <div className="flex items-end gap-5">
                {["size-4", "size-5", "size-6", "size-8", "size-12"].map((s) => (
                  <LogoMark key={s} tone="dark" className={s} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Cores" description="Paleta fechada: apenas estes tokens existem no Tailwind. Interface predominantemente clara; azul para identidade e ação; verde para estados positivos.">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {colors.map((c) => (
              <li key={c.token} className="overflow-hidden rounded-lg border border-line bg-surface">
                <div className="flex h-16 items-end p-2.5" style={{ backgroundColor: c.hex }}>
                  <span className={`text-xs font-medium ${c.dark ? "text-white" : "text-ink"}`}>Aa</span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-ink">{c.token}</p>
                  <p className="tabular text-xs text-muted">{c.hex}</p>
                  <p className="mt-1 text-xs text-muted">{c.use}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Tipografia" description="Inter variável, servida localmente. Escala editorial fluida para o site; escala compacta para o painel.">
          <div className="divide-y divide-line rounded-lg border border-line bg-surface">
            {type.map((t) => (
              <div key={t.name} className="grid gap-2 p-5 md:grid-cols-[10rem_1fr] md:items-baseline">
                <div>
                  <p className="text-sm font-medium text-ink">{t.name}</p>
                  <p className="text-xs text-muted">{t.spec}</p>
                </div>
                <p className={t.className}>Atendimento organizado, do primeiro contato ao agendamento.</p>
              </div>
            ))}
          </div>
        </Section>

        <Static />
        <Interactive />
      </div>
    </main>
  );
}
