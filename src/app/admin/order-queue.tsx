"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CoffeeIcon, XIcon } from "@phosphor-icons/react";
import { setOrderStatus } from "@/app/actions/orders";
import { DrinkArt } from "@/components/drink-art";
import { useAction } from "@/components/toaster";
import { Badge, Button, EmptyState } from "@/components/ui";

type QueueOrder = {
  id: string;
  status: "PENDING" | "PREPARING" | "READY";
  person: string;
  company: string;
  notes: string | null;
  time: string;
  createdAt: string;
  stale: boolean;
  drink: { name: string; category: string; imageUrl: string | null };
};

const COLUMNS = [
  { status: "PENDING", title: "Nuevos" },
  { status: "PREPARING", title: "Preparando" },
  { status: "READY", title: "Listos para recoger" },
] as const;

const NEXT = {
  PENDING: { to: "PREPARING", label: "Preparar" },
  PREPARING: { to: "READY", label: "Marcar listo" },
  READY: { to: "DELIVERED", label: "Entregado" },
} as const;

const WAIT_WARN_MIN = 5;

/** Reloj que avanza cada 30 s para mostrar "hace N min" sin recargar */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function waitLabel(min: number) {
  return min < 1 ? "Ahora" : `${min} min`;
}

export function OrderQueue({ orders }: { orders: QueueOrder[] }) {
  const now = useNow();
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<CoffeeIcon className="size-6" />}
        title="Sin pedidos por ahora"
        body="Los pedidos nuevos aparecen aquí solos. Esta pantalla se actualiza cada pocos segundos."
      />
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3 md:gap-5">
      {COLUMNS.map((col) => {
        const list = orders.filter((o) => o.status === col.status);
        return (
          <section key={col.status} aria-labelledby={`col-${col.status}`} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <h2 id={`col-${col.status}`} className="text-[15px] font-semibold text-ink">
                {col.title}
              </h2>
              <span className="font-mono text-[13px] text-ink-2 tabular-nums">{list.length}</span>
            </div>
            <ul className="flex flex-col gap-3">
              <AnimatePresence initial={false} mode="popLayout">
                {list.map((o) => (
                  <QueueCard key={o.id} order={o} now={now} />
                ))}
              </AnimatePresence>
              {list.length === 0 && (
                <li className="rounded-[20px] border border-dashed border-line px-4 py-6 text-center text-[13px] text-ink-2">
                  Nada aquí
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function QueueCard({ order, now }: { order: QueueOrder; now: number }) {
  const waited = Math.max(0, Math.floor((now - new Date(order.createdAt).getTime()) / 60_000));
  const late = order.status !== "READY" && waited >= WAIT_WARN_MIN;
  const [pending, run] = useAction();
  const reduce = useReducedMotion();
  const next = NEXT[order.status];

  return (
    <motion.li
      layout={!reduce}
      layoutId={reduce ? undefined : order.id}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      className="rounded-[22px] bg-surface p-4 shadow-card"
    >
      <div className="flex items-start gap-3">
        <DrinkArt
          category={order.drink.category}
          imageUrl={order.drink.imageUrl}
          name={order.drink.name}
          className="size-14 shrink-0 rounded-[16px]"
          iconClassName="size-7"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{order.drink.name}</p>
          <p className="truncate text-[15px] text-ink">{order.person}</p>
          <p className="truncate text-[13px] text-ink-2">
            {order.company}, {order.time}
          </p>
        </div>
        {order.stale ? (
          <Badge tone="warn">De otro día</Badge>
        ) : (
          <Badge tone={late ? "warn" : "neutral"} className="font-mono tabular-nums">
            {waitLabel(waited)}
          </Badge>
        )}
      </div>
      {order.notes ? (
        <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-[14px] text-ink">{order.notes}</p>
      ) : null}
      <div className="mt-4 flex items-center gap-2">
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() => run(() => setOrderStatus(order.id, next.to))}
        >
          {next.label}
        </Button>
        <Button
          variant="secondary"
          aria-label={`Cancelar pedido de ${order.person}`}
          disabled={pending}
          onClick={() => run(() => setOrderStatus(order.id, "CANCELLED"))}
          className="w-10 px-0"
        >
          <XIcon className="size-4" weight="bold" />
        </Button>
      </div>
    </motion.li>
  );
}
