"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "block w-full rounded-md border bg-surface text-sm text-ink shadow-xs placeholder:text-muted/80 " +
  "transition-[border-color,box-shadow] duration-150 " +
  "hover:border-line-strong focus:border-brand-600 focus:shadow-focus focus:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted " +
  "aria-[invalid=true]:border-danger-700 aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgba(180,35,24,0.18)]";

interface FieldProps {
  label: ReactNode;
  /** Texto de apoio abaixo do campo. */
  hint?: ReactNode;
  /** Mensagem de erro (ativa aria-invalid e é anunciada). */
  error?: string | null;
  optional?: boolean;
  className?: string;
  /** Recebe os atributos de acessibilidade que devem ir no controle. */
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
}

/**
 * Agrupa label + controle + dica + erro com as ligações de acessibilidade corretas.
 * Uso: <Field label="E-mail">{(p) => <Input {...p} type="email" />}</Field>
 */
export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-medium text-ink">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-muted">Opcional</span>}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-xs font-medium text-danger-700">
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="size-3.5 shrink-0">
            <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 3.25a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0V5A.75.75 0 0 0 8 4.25Zm0 7.5a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10 px-3 border-line", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 resize-y px-3 py-2.5 leading-relaxed border-line", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(control, "h-10 appearance-none border-line pl-3 pr-9", className)} {...props}>
        {children}
      </select>
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted">
        <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Campo de busca com ícone. Use sempre com aria-label ou um <label> visível. */
export function SearchInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted">
        <circle cx="9" cy="9" r="5.75" stroke="currentColor" strokeWidth="1.5" />
        <path d="m13.5 13.5 3.25 3.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input type="search" className={cn(control, "h-10 border-line pl-9 pr-3")} {...props} />
    </div>
  );
}

/** Interruptor acessível (role="switch"). */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <p id={`${id}-label`} className="text-sm font-medium text-ink">
          {label}
        </p>
        {description && (
          <p id={`${id}-desc`} className="mt-0.5 text-sm text-muted">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50",
          checked ? "bg-brand-600" : "bg-line-strong",
        )}
      >
        <span
          aria-hidden="true"
          className={cn("size-5 rounded-full bg-white shadow-sm transition-transform duration-150", checked ? "translate-x-[1.125rem]" : "translate-x-0.5")}
        />
      </button>
    </div>
  );
}
