import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger" | "inverse" | "inverse-outline";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 " +
  "[&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white shadow-xs hover:bg-brand-700 active:bg-brand-700",
  secondary: "border border-line bg-surface text-ink shadow-xs hover:border-line-strong hover:bg-canvas",
  tertiary: "text-ink-soft hover:bg-canvas hover:text-ink",
  danger: "bg-danger-700 text-white shadow-xs hover:bg-[#9a1d13]",
  inverse: "bg-white text-navy-900 shadow-xs hover:bg-navy-100",
  "inverse-outline": "border border-white/25 text-white hover:border-white/50 hover:bg-white/5 focus-visible:outline-white",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[0.8125rem] [&_svg]:size-3.5",
  md: "h-10 px-4 text-sm [&_svg]:size-4",
  lg: "h-12 px-5 text-[0.9375rem] [&_svg]:size-[1.125rem]",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Mostra spinner, bloqueia cliques e anuncia "carregando" para leitores de tela. */
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  leadingIcon,
  trailingIcon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="size-4" label="Carregando" /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

/** Link com aparência de botão (navegação). Para ações, use <Button>. */
export function ButtonLink({ variant, size, fullWidth, leadingIcon, trailingIcon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth, className })} {...props}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </Link>
  );
}

type IconButtonProps = Omit<ComponentProps<"button">, "aria-label"> & {
  /** Obrigatório: botões só com ícone precisam de nome acessível. */
  label: string;
  size?: "sm" | "md";
  variant?: "ghost" | "outline";
};

export function IconButton({ label, size = "md", variant = "ghost", className, children, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-150",
        "hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        "active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
        variant === "outline" && "border border-line bg-surface shadow-xs",
        size === "sm" ? "size-8 [&_svg]:size-4" : "size-10 [&_svg]:size-[1.125rem]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
