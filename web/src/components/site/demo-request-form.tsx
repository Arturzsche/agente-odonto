"use client";

import { useRef, useState, type FormEvent } from "react";
import { CircleCheck, Mail, Send } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  demoRequestLimits,
  normalizeDemoRequest,
  validateDemoRequest,
  type DemoRequestErrors,
  type DemoRequestField,
  type DemoRequestResponse,
} from "@/lib/validation/demo-request";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; title: string; message: string };

const fieldOrder: DemoRequestField[] = ["name", "clinic", "email", "whatsapp", "message"];

interface DemoRequestFormProps {
  /** Há um destino real (DEMO_REQUEST_WEBHOOK_URL) para os pedidos? */
  configured: boolean;
  /** E-mail comercial público, usado como alternativa quando o envio falha. */
  contactEmail: string | null;
}

export function DemoRequestForm({ configured, contactEmail }: DemoRequestFormProps) {
  const [errors, setErrors] = useState<DemoRequestErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const form = useRef<HTMLFormElement>(null);

  const mailto = contactEmail ? `mailto:${contactEmail}?subject=${encodeURIComponent("Demonstração do OdontoAgent")}` : null;

  const focusFirstError = (found: DemoRequestErrors) => {
    const first = fieldOrder.find((f) => found[f]);
    if (first) form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  // Revalida o campo ao sair dele, só se já estiver marcado com erro.
  const revalidate = (field: DemoRequestField) => {
    if (!errors[field] || !form.current) return;
    const data = normalizeDemoRequest(Object.fromEntries(new FormData(form.current)));
    setErrors((current) => ({ ...current, [field]: validateDemoRequest(data)[field] }));
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.kind === "sending") return;

    const values = Object.fromEntries(new FormData(event.currentTarget));
    const found = validateDemoRequest(normalizeDemoRequest(values));
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStatus({ kind: "idle" });
      focusFirstError(found);
      return;
    }

    setStatus({ kind: "sending" });
    try {
      const response = await fetch("/api/demonstracao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await response.json().catch(() => null)) as DemoRequestResponse | null;

      if (response.ok && body?.ok) {
        setStatus({ kind: "sent" });
        return;
      }
      if (body && !body.ok && body.error === "invalid") {
        setErrors(body.fields);
        setStatus({ kind: "idle" });
        focusFirstError(body.fields);
        return;
      }
      const title = body && !body.ok && body.error === "not_configured" ? "Envio indisponível neste ambiente" : "Pedido não enviado";
      const message = body && !body.ok && "message" in body ? body.message : "Não conseguimos registrar seu pedido agora. Tente novamente em instantes.";
      setStatus({ kind: "error", title, message });
    } catch {
      setStatus({ kind: "error", title: "Pedido não enviado", message: "Verifique sua conexão e tente novamente." });
    }
  }

  if (status.kind === "sent") {
    return (
      <div role="status" className="rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <CircleCheck className="size-8 text-success" aria-hidden="true" />
        <h3 className="mt-4 text-lg font-semibold text-navy">Pedido recebido</h3>
        <p className="mt-2 text-sm text-ink-soft">Obrigado! Nossa equipe vai entrar em contato pelo e-mail informado para combinar a demonstração.</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-6"
          onClick={() => {
            setErrors({});
            setStatus({ kind: "idle" });
          }}
        >
          Enviar outro pedido
        </Button>
      </div>
    );
  }

  const sending = status.kind === "sending";

  return (
    <form ref={form} noValidate onSubmit={onSubmit} aria-describedby="formulario-aviso" className="space-y-5 rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      {!configured && (
        <Alert tone="warning" title="Envio ainda não configurado">
          Este ambiente ainda não tem um destino configurado para os pedidos, por isso o formulário não pode ser enviado.
          {mailto ? " Use o e-mail abaixo para falar com a equipe." : " Tente novamente mais tarde."}
        </Alert>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nome" error={errors.name}>
          {(p) => <Input {...p} name="name" autoComplete="name" maxLength={demoRequestLimits.name} required onBlur={() => revalidate("name")} />}
        </Field>
        <Field label="Clínica" error={errors.clinic}>
          {(p) => <Input {...p} name="clinic" autoComplete="organization" maxLength={demoRequestLimits.clinic} required onBlur={() => revalidate("clinic")} />}
        </Field>
        <Field label="E-mail profissional" error={errors.email}>
          {(p) => <Input {...p} type="email" name="email" autoComplete="email" inputMode="email" maxLength={demoRequestLimits.email} required onBlur={() => revalidate("email")} />}
        </Field>
        <Field label="WhatsApp" optional hint="Com DDD." error={errors.whatsapp}>
          {(p) => <Input {...p} type="tel" name="whatsapp" autoComplete="tel" inputMode="tel" maxLength={demoRequestLimits.whatsapp} onBlur={() => revalidate("whatsapp")} />}
        </Field>
      </div>
      <Field label="Mensagem" optional hint="Conte sobre a rotina de atendimento da clínica, se quiser." error={errors.message}>
        {(p) => <Textarea {...p} name="message" rows={4} maxLength={demoRequestLimits.message} onBlur={() => revalidate("message")} />}
      </Field>

      {/* Campo-armadilha para robôs: invisível e fora da ordem de tabulação. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Site
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {status.kind === "error" && (
        <Alert tone="danger" title={status.title}>
          {status.message}
          {mailto && " Se preferir, escreva para a equipe por e-mail."}
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button type="submit" size="lg" loading={sending} icon={<Send />} disabled={!configured}>
          {sending ? "Enviando…" : "Solicitar demonstração"}
        </Button>
        {mailto && (!configured || status.kind === "error") && (
          <ButtonLink href={mailto} variant="secondary" size="lg" icon={<Mail />}>
            Enviar por e-mail
          </ButtonLink>
        )}
      </div>
      <p id="formulario-aviso" className="text-xs text-muted">
        Usamos estes dados apenas para responder ao seu pedido de demonstração. Não informe dados de pacientes.
      </p>
    </form>
  );
}
