import { clsx, type ClassValue } from "clsx";

/** Junta classes condicionalmente. Ex.: cn("px-4", isActive && "bg-brand-50"). */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
