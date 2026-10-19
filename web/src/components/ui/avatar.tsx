import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

// Tons neutros e frios: o avatar não deve competir com os status semânticos.
const palettes = [
  "bg-brand-50 text-brand-700",
  "bg-navy-100 text-navy-800",
  "bg-[#EEF2F6] text-ink-soft",
  "bg-[#E9F1F7] text-navy-700",
  "bg-success-50 text-success-800",
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, size = "md", className }: { name: string; size?: "xs" | "sm" | "md" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-tight",
        { xs: "size-6 text-[0.625rem]", sm: "size-8 text-xs", md: "size-9 text-[0.8125rem]", lg: "size-11 text-sm" }[size],
        palettes[hash(name) % palettes.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
