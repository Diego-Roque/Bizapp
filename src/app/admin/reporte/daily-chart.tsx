"use client";

import { useState } from "react";

type Day = { day: number; key: string; count: number };

/** Barras diarias, una sola serie. Tooltip por barra con zona de toque más ancha que la marca. */
export function DailyChart({ data }: { data: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  // Escala con números redondos para la guía superior
  const top = max <= 4 ? max : Math.ceil(max / 5) * 5;
  const H = 160;
  const total = data.reduce((s, d) => s + d.count, 0);
  const active = hover != null ? data[hover] : null;

  if (total === 0) {
    return <p className="py-10 text-center text-[14px] text-ink-2">Todavía no hay entregas este mes.</p>;
  }

  return (
    <figure className="relative">
      <div className="flex gap-3">
        <div className="flex w-6 flex-col justify-between text-right font-mono text-[11px] text-ink-2 tabular-nums" style={{ height: H }}>
          <span>{top}</span>
          <span>0</span>
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-line" aria-hidden />
          <div className="absolute inset-x-0 border-t border-line" style={{ top: H }} aria-hidden />
          <div
            className="relative grid items-end gap-[2px]"
            style={{ height: H, gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label={`${total} bebidas entregadas en el mes`}
          >
            {data.map((d, i) => (
              <div
                key={d.key}
                className="flex h-full items-end justify-center"
                onPointerEnter={() => setHover(i)}
                onPointerDown={() => setHover(i)}
              >
                <div
                  className="w-full max-w-[18px] rounded-t-[4px] transition-opacity duration-150"
                  style={{
                    height: d.count ? Math.max(3, (d.count / top) * H) : 0,
                    background: "var(--chart)",
                    opacity: hover == null || hover === i ? 1 : 0.35,
                  }}
                />
              </div>
            ))}
          </div>
          {active && (
            <div
              className="glass pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-line px-3 py-1.5 text-[13px] whitespace-nowrap shadow-float"
              style={{ left: `${((hover! + 0.5) / data.length) * 100}%` }}
            >
              <span className="text-ink-2">Día {active.day}: </span>
              <span className="font-mono font-medium text-ink tabular-nums">
                {active.count} {active.count === 1 ? "bebida" : "bebidas"}
              </span>
            </div>
          )}
          <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-2 tabular-nums">
            <span>1</span>
            <span>{Math.ceil(data.length / 2)}</span>
            <span>{data.length}</span>
          </div>
        </div>
      </div>
    </figure>
  );
}
