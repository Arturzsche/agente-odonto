"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info" | "warning";

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

const icons = { success: CheckCircle2, error: XCircle, info: Info, warning: TriangleAlert };
const iconColor = { success: "text-success-700", error: "text-danger-700", info: "text-brand-600", warning: "text-warning-700" };

/** Provedor de notificações efêmeras. Anuncia via região aria-live. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const schedule = useCallback((id: number) => timers.current.set(id, setTimeout(() => dismiss(id), 5000)), [dismiss]);

  const push = useCallback(
    (toast: ToastInput) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((list) => [...list.slice(-2), { ...toast, id }]);
      schedule(id);
    },
    [schedule],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      >
        {toasts.map((toast) => {
          const tone = toast.tone ?? "info";
          const Icon = icons[tone];
          return (
            <div
              key={toast.id}
              role={tone === "error" ? "alert" : "status"}
              onPointerEnter={() => clearTimeout(timers.current.get(toast.id))}
              onPointerLeave={() => schedule(toast.id)}
              className="pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-lg border border-line bg-surface p-3.5 shadow-lg"
            >
              <Icon className={cn("mt-0.5 size-[1.125rem] shrink-0", iconColor[tone])} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-sm text-muted">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Fechar notificação"
                className="-m-1 rounded-md p-1 text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>.");
  return ctx;
}
