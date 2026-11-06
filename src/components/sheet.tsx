"use client";

import { useEffect, useId, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "motion/react";
import { XIcon } from "@phosphor-icons/react";

// Proyección de momento (curva de desaceleración tipo scroll)
function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

const DESKTOP = "(min-width: 768px)";
function subscribeDesktop(cb: () => void) {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const useIsDesktop = () =>
  useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP).matches, () => false);

const noop = () => () => {};
// true solo en el cliente: el portal necesita document.body
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

const spring = { type: "spring" as const, bounce: 0, duration: 0.4 };

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();
  const controls = useDragControls();
  const titleId = useId();
  const mounted = useMounted();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function onDragEnd(_: unknown, info: PanInfo) {
    // Decide por destino proyectado, no por la posición al soltar: un flick corto también cierra
    const projected = info.offset.y + project(info.velocity.y);
    if (projected > 160) onClose();
  }

  const panel = desktop
    ? {
        initial: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 },
      }
    : {
        initial: reduce ? { opacity: 0 } : { y: "100%" },
        animate: reduce ? { opacity: 1 } : { y: 0 },
        exit: reduce ? { opacity: 0 } : { y: "100%" },
      };

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-[var(--scrim)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            {...panel}
            transition={spring}
            drag={!desktop && !reduce ? "y" : false}
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.9 }}
            dragTransition={{ bounceStiffness: 500, bounceDamping: 40 }}
            onDragEnd={onDragEnd}
            className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-surface shadow-float md:max-w-lg md:rounded-[24px]"
          >
            <div
              onPointerDown={(e) => controls.start(e)}
              className="shrink-0 touch-none px-5 pt-2.5 pb-3 md:cursor-default md:pt-5"
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-surface-2 md:hidden" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id={titleId} className="t-title text-ink">
                    {title}
                  </h2>
                  {description ? <p className="mt-1 text-[14px] text-ink-2">{description}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="pressable grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2 hover:text-ink"
                >
                  <XIcon className="size-4" weight="bold" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
