import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

const variants = {
  /** Ação principal da tela (uma por contexto). */
  primary: "bg-brand text-white shadow-xs hover:bg-brand-strong active:bg-brand-strong",
  /** Ação alternativa. */
  secondary: "border border-line bg-surface text-ink shadow-xs hover:border-line-strong hover:bg-canvas",
  /** Ação de baixa ênfase (sem contorno). */
  tertiary: "text-ink-soft hover:bg-canvas hover:text-ink",
  /** Ação destrutiva, sempre com confirmação. */
  danger: "bg-danger text-white shadow-xs hover:bg-danger-strong",
  /** Primária sobre fundo navy. */
  inverse: "bg-white text-navy shadow-xs hover:bg-brand-soft",
  /** Secundária sobre fundo navy. */
  "inverse-outline": "border border-navy-soft text-white hover:border-on-navy hover:bg-navy-strong",
} as const;

const sizes = {
  sm: "h-8 gap-1.5 px-3 text-[0.8125rem] [&_svg]:size-3.5",
  md: "h-10 gap-2 px-4 text-sm [&_svg]:size-4",
  lg: "h-12 gap-2 px-5 text-[0.9375rem] [&_svg]:size-[1.125rem]",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

/** Classes de botão — use em elementos que não podem ser <Button>/<ButtonLink>. */
export function buttonStyles({ variant = "primary", size = "md", fullWidth, className }: ButtonStyleProps & { className?: string } = {}) {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap rounded-md font-medium",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-standard",
    "focus-ring active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    fullWidth && "w-full",
    className,
  );
}

interface ButtonProps extends ComponentProps<"button">, ButtonStyleProps {
  /** Mostra spinner, bloqueia novos cliques e marca aria-busy. */
  loading?: boolean;
  icon?: ReactNode;
  iconEnd?: ReactNode;
}

export function Button({ variant, size, fullWidth, loading = false, icon, iconEnd, className, children, disabled, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner label="Processando" /> : icon}
      {children}
      {!loading && iconEnd}
    </button>
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link>, ButtonStyleProps {
  icon?: ReactNode;
  iconEnd?: ReactNode;
}

/** Link de navegação com aparência de botão. Para ações (enviar, salvar), use <Button>. */
export function ButtonLink({ variant, size, fullWidth, icon, iconEnd, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonStyles({ variant, size, fullWidth, className })} {...props}>
      {icon}
      {children}
      {iconEnd}
    </Link>
  );
}

interface IconButtonProps extends Omit<ComponentProps<"button">, "aria-label" | "children"> {
  /** Nome acessível obrigatório (também exibido como dica nativa). */
  label: string;
  icon: ReactNode;
  size?: "sm" | "md";
  variant?: "ghost" | "outline";
}

/** Botão só com ícone. */
export function IconButton({ label, icon, size = "md", variant = "ghost", className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-150",
        "focus-ring hover:bg-canvas hover:text-ink active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
        variant === "outline" && "border border-line bg-surface shadow-xs",
        size === "sm" ? "size-8 [&_svg]:size-4" : "size-10 [&_svg]:size-[1.125rem]",
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
