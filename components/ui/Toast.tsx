"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "info" | "warning";

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds before auto-dismiss. 0 keeps the toast until dismissed. */
  duration?: number;
};

type ToastRecord = ToastInput & { id: number; tone: ToastTone };

const ToastContext = createContext<{ push: (toast: ToastInput) => void } | null>(null);

const TONE_STYLE: Record<ToastTone, { border: string; icon: ReactNode }> = {
  success: { border: "border-l-brand-500", icon: <CheckCircle2 size={18} className="text-brand-600" /> },
  error: { border: "border-l-danger", icon: <AlertTriangle size={18} className="text-danger" /> },
  info: { border: "border-l-info", icon: <Info size={18} className="text-info" /> },
  warning: { border: "border-l-warning", icon: <AlertTriangle size={18} className="text-warning" /> },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const counter = useRef(0);
  const timers = useRef<number[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      counter.current += 1;
      const id = counter.current;
      const record: ToastRecord = { ...toast, tone: toast.tone ?? "info", id };
      setToasts((current) => [...current.slice(-3), record]);
      const duration = toast.duration ?? 5000;
      if (duration > 0) {
        const timer = window.setTimeout(() => dismiss(id), duration);
        timers.current.push(timer);
      }
    },
    [dismiss]
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[90] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-auto sm:items-end"
        role="status"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-line border-l-[3px] bg-surface p-3.5 shadow-raised animate-fadeUp ${TONE_STYLE[toast.tone].border}`}
          >
            <span className="mt-0.5 shrink-0">{TONE_STYLE[toast.tone].icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-navy-900">{toast.title}</p>
              {toast.description && <p className="mt-0.5 text-sm text-muted">{toast.description}</p>}
            </div>
            <button
              type="button"
              className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-navy-300 hover:bg-navy-50 hover:text-navy-600"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Keep components usable outside the provider (e.g. isolated stories).
    return { push: () => undefined } as { push: (toast: ToastInput) => void };
  }
  return context;
}
