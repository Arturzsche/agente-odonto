"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { feedbackTones, type FeedbackTone } from "./feedback";

interface ToastOptions {
  title: string;
  description?: string;
  tone?: FeedbackTone;
}

interface ToastItem extends Required<Pick<ToastOptions, "title" | "tone">> {
  id: number;
  description?: string;
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);
const DURATION_MS = 5000;
const MAX_VISIBLE = 3;

/**
 * Notificações efêmeras (confirmações de ação, falhas não bloqueantes).
 * Pausam no hover; podem ser dispensadas; erros usam role="alert".
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const schedule = useCallback((id: number) => timers.current.set(id, setTimeout(() => dismiss(id), DURATION_MS)), [dismiss]);

  const show = useCallback(
    ({ title, description, tone = "info" }: ToastOptions) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((list) => [...list.slice(-(MAX_VISIBLE - 1)), { id, title, description, tone }]);
      schedule(id);
    },
    [schedule],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <section aria-label="Notificações" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:right-0 sm:left-auto sm:items-end">
        {toasts.map((toast) => {
          const { icon: Icon, iconColor } = feedbackTones[toast.tone];
          return (
            <div
              key={toast.id}
              role={toast.tone === "danger" ? "alert" : "status"}
              onPointerEnter={() => clearTimeout(timers.current.get(toast.id))}
              onPointerLeave={() => schedule(toast.id)}
              className="pointer-events-auto flex w-full max-w-sm animate-enter items-start gap-3 rounded-lg border border-line bg-surface p-3.5 shadow-lg"
            >
              <Icon className={cn("mt-0.5 size-4.5 shrink-0", iconColor)} aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium text-ink">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-muted">{toast.description}</p>}
              </div>
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dispensar notificação" className="-m-1 rounded-sm p-1 text-muted hover:bg-canvas hover:text-ink focus-ring">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </section>
    </ToastContext.Provider>
  );
}

/** Retorna a função para exibir uma notificação. Requer <ToastProvider> (já no layout raiz). */
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast precisa estar dentro de <ToastProvider>.");
  return show;
}
