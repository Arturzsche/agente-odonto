"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { Check, ChevronDown, CircleAlert, Search } from "lucide-react";
import { cn } from "@/lib/cn";

/** Estilo base de todos os controles de texto (input, textarea, select). */
const controlStyles = cn(
  "block w-full rounded-md border border-line-strong bg-surface text-sm text-ink shadow-xs",
  "placeholder:text-faint transition-[border-color,box-shadow] duration-150",
  "hover:border-faint focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/15",
  "disabled:cursor-not-allowed disabled:border-line disabled:bg-canvas disabled:text-muted",
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/15",
);

type ControlProps = { id: string; "aria-describedby"?: string; "aria-invalid"?: true };

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  /** Mensagem de erro: ativa aria-invalid no controle e é anunciada. */
  error?: string | null;
  optional?: boolean;
  /** Esconde o rótulo visualmente (continua acessível). Use só quando o contexto já explica o campo. */
  hideLabel?: boolean;
  className?: string;
  children: (control: ControlProps) => ReactNode;
}

/**
 * Agrupa rótulo, controle, dica e erro com as ligações de acessibilidade corretas.
 * Uso: <Field label="E-mail">{(p) => <Input type="email" {...p} />}</Field>
 */
export function Field({ label, hint, error, optional, hideLabel, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className={cn("flex items-baseline justify-between gap-3 text-sm font-medium text-ink", hideLabel && "sr-only")}>
        {label}
        {optional && <span className="text-xs font-normal text-muted">Opcional</span>}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-xs font-medium text-danger">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlStyles, "h-10 px-3", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlStyles, "min-h-24 resize-y px-3 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(controlStyles, "h-10 appearance-none pr-9 pl-3", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
    </div>
  );
}

/** Campo de busca com ícone. Precisa de rótulo: via <Field hideLabel> ou aria-label. */
export function SearchInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input type="search" className={cn(controlStyles, "h-10 pr-3 pl-9")} {...props} />
    </div>
  );
}

/** Caixa de seleção com rótulo clicável e descrição opcional. */
export function Checkbox({ label, description, className, ...props }: Omit<ComponentProps<"input">, "type"> & { label: ReactNode; description?: ReactNode }) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <span className="relative mt-0.5 inline-flex">
        <input
          id={id}
          type="checkbox"
          aria-describedby={description ? `${id}-desc` : undefined}
          className={cn(
            "peer size-4.5 shrink-0 appearance-none rounded-xs border border-line-strong bg-surface transition-colors",
            "checked:border-brand checked:bg-brand hover:border-faint focus-ring disabled:cursor-not-allowed disabled:opacity-50",
          )}
          {...props}
        />
        <Check className="pointer-events-none absolute inset-0 m-auto size-3.5 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} aria-hidden="true" />
      </span>
      <span className="text-sm">
        <label htmlFor={id} className="font-medium text-ink">
          {label}
        </label>
        {description && (
          <span id={`${id}-desc`} className="mt-0.5 block text-muted">
            {description}
          </span>
        )}
      </span>
    </div>
  );
}

/** Interruptor liga/desliga (role="switch") para preferências com efeito imediato. */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-6">
      <span className="text-sm">
        <span id={`${id}-label`} className="font-medium text-ink">
          {label}
        </span>
        {description && (
          <span id={`${id}-desc`} className="mt-0.5 block text-muted">
            {description}
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-150 focus-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-brand" : "bg-line-strong",
        )}
      >
        <span aria-hidden="true" className={cn("size-5 rounded-full bg-white shadow-sm transition-transform duration-150", checked ? "translate-x-4.5" : "translate-x-0.5")} />
      </button>
    </div>
  );
}
