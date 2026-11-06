"use client";

import { createContext, useCallback, useContext, useRef, useState, useTransition, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import type { ActionState } from "@/app/actions/types";

type Toast = { id: number; text: string; kind: "ok" | "error" };
const ToastContext = createContext<(text: string, kind?: Toast["kind"]) => void>(() => {});

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const reduce = useReducedMotion();

  const push = useCallback((text: string, kind: Toast["kind"] = "ok") => {
    const id = ++nextId.current;
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 4500 : 2800);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.75rem)] z-[70] flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              role={t.kind === "error" ? "alert" : "status"}
              className="glass pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full border border-line px-4 py-2.5 text-[14px] font-medium text-ink shadow-float"
            >
              {t.kind === "ok" ? (
                <CheckCircleIcon weight="fill" className="size-5 shrink-0 text-ok" />
              ) : (
                <WarningCircleIcon weight="fill" className="size-5 shrink-0 text-danger" />
              )}
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/** Ejecuta una server action dentro de una transición y muestra su resultado como toast */
export function useAction() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = useCallback(
    (fn: () => Promise<ActionState>, onDone?: (r: ActionState) => void) =>
      start(async () => {
        try {
          const r = await fn();
          if (r.error) toast(r.error, "error");
          else if (r.message) toast(r.message, "ok");
          onDone?.(r);
        } catch {
          toast("Algo salió mal. Intenta de nuevo.", "error");
        }
      }),
    [toast],
  );
  return [pending, run] as const;
}
