"use client";

import { useActionState, useState } from "react";
import {
  ArchiveIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  PackageIcon,
  PencilSimpleIcon,
  PlusIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { archiveItem, recordMovement, saveItem } from "@/app/actions/inventory";
import { initialState } from "@/app/actions/types";
import { UNITS } from "@/lib/config";
import { fmtMoney, fmtQty } from "@/lib/format";
import { Sheet } from "@/components/sheet";
import { useAction } from "@/components/toaster";
import { useFormResult } from "@/components/use-form-result";
import { Badge, Button, EmptyState, Field, PageHeader, cn, inputClass } from "@/components/ui";

type Item = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  unitCost: number;
  usedIn: { drink: string; quantity: number }[];
};

/** Porciones completas que alcanzan con el stock actual */
const servings = (stock: number, perDrink: number) => (perDrink > 0 ? Math.max(0, Math.floor(stock / perDrink)) : 0);
type Movement = {
  id: string;
  type: "PURCHASE" | "CONSUMPTION" | "WASTE" | "ADJUSTMENT";
  quantity: number;
  note: string | null;
  when: string;
  item: string;
  unit: string;
  by: string | null;
};
type MoveType = "PURCHASE" | "WASTE" | "ADJUSTMENT";

const TYPE_LABEL: Record<Movement["type"], string> = {
  PURCHASE: "Entrada",
  CONSUMPTION: "Consumo",
  WASTE: "Merma",
  ADJUSTMENT: "Ajuste",
};

export function InventoryManager({ items, movements }: { items: Item[]; movements: Movement[] }) {
  const [session, setSession] = useState(0);
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [moving, setMoving] = useState<{ item: Item; type: MoveType } | null>(null);
  const open = <T,>(set: (v: T) => void, v: T) => {
    setSession((s) => s + 1);
    set(v);
  };

  const low = items.filter((i) => i.stock <= i.minStock);
  const value = items.reduce((s, i) => s + Math.max(0, i.stock) * i.unitCost, 0);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Ingredientes"
        subtitle={
          <>
            Valor en stock {fmtMoney(value)}.{" "}
            {low.length > 0 ? (
              <span className="font-medium text-warn">
                {low.length} {low.length === 1 ? "ingrediente bajo" : "ingredientes bajos"} de mínimo.
              </span>
            ) : (
              "Todo arriba del mínimo."
            )}
          </>
        }
        actions={
          <Button onClick={() => open(setEditing, "new" as const)}>
            <PlusIcon className="size-4" weight="bold" />
            Nuevo ingrediente
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<PackageIcon className="size-6" />}
          title="Sin ingredientes"
          body="Da de alta los ingredientes de tus bebidas (café, leche, limón, hielo) con su unidad y costo, o créalos al armar la receta en Menú."
          action={<Button onClick={() => open(setEditing, "new" as const)}>Nuevo ingrediente</Button>}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <ItemCard
              key={i.id}
              item={i}
              onEdit={() => open(setEditing, i)}
              onMove={(type) => open(setMoving, { item: i, type })}
            />
          ))}
        </ul>
      )}

      <section aria-labelledby="mov-title" className="flex flex-col gap-4">
        <h2 id="mov-title" className="t-title text-ink">
          Últimos movimientos
        </h2>
        {movements.length === 0 ? (
          <p className="text-[14px] text-ink-2">Aún no hay movimientos.</p>
        ) : (
          <div className="overflow-hidden rounded-[20px] bg-surface shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[14px]">
                <thead className="text-[12px] text-ink-2">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Ingrediente</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                    <th className="px-4 py-3 font-medium">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-2.5 whitespace-nowrap text-ink-2">{m.when}</td>
                      <td className="px-4 py-2.5 text-ink">{m.item}</td>
                      <td className="px-4 py-2.5 text-ink-2">{TYPE_LABEL[m.type]}</td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-mono whitespace-nowrap tabular-nums",
                          m.quantity >= 0 ? "text-ok" : "text-ink",
                        )}
                      >
                        {m.quantity > 0 ? "+" : ""}
                        {fmtQty(m.quantity)} {m.unit}
                      </td>
                      <td className="max-w-[24ch] truncate px-4 py-2.5 text-ink-2">
                        {[m.note, m.by].filter(Boolean).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <ItemEditor key={`e${session}`} item={editing} onClose={() => setEditing(null)} />
      <MovementEditor key={`m${session}`} target={moving} onClose={() => setMoving(null)} />
    </div>
  );
}

function ItemCard({ item, onEdit, onMove }: { item: Item; onEdit: () => void; onMove: (t: MoveType) => void }) {
  const isLow = item.stock <= item.minStock;
  const [pending, run] = useAction();
  return (
    <li className="flex flex-col gap-4 rounded-[20px] bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{item.name}</p>
          <p className="text-[13px] text-ink-2">
            {fmtMoney(item.unitCost)} por {item.unit}
          </p>
        </div>
        <button
          onClick={onEdit}
          aria-label={`Editar ${item.name}`}
          className="pressable grid size-8 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <PencilSimpleIcon className="size-4" />
        </button>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="leading-none">
          <span className="font-mono text-[28px] font-medium tracking-[-0.02em] text-ink tabular-nums">
            {fmtQty(item.stock)}
          </span>
          <span className="ml-1.5 text-[14px] text-ink-2">{item.unit}</span>
        </p>
        {isLow ? (
          <Badge tone="warn">
            <WarningIcon className="size-3.5" weight="bold" />
            Mínimo {fmtQty(item.minStock)}
          </Badge>
        ) : (
          <span className="text-[12px] text-ink-2">Mínimo {fmtQty(item.minStock)}</span>
        )}
      </div>
      {item.usedIn.length > 0 ? (
        <div className="rounded-xl bg-surface-2 px-3 py-2.5">
          <p className="text-[12px] text-ink-2">Alcanza para</p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
            {item.usedIn.map((u) => {
              const n = servings(item.stock, u.quantity);
              return (
                <li key={u.drink} className="whitespace-nowrap">
                  <span className={cn("font-mono font-medium tabular-nums", n === 0 ? "text-danger" : "text-ink")}>{n}</span>{" "}
                  <span className="text-ink-2">{u.drink}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-[13px] text-ink-2">Ninguna bebida lo usa todavía</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onMove("PURCHASE")}>
          <ArrowDownIcon className="size-3.5" weight="bold" />
          Entrada
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onMove("WASTE")}>
          <ArrowUpIcon className="size-3.5" weight="bold" />
          Merma
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onMove("ADJUSTMENT")}>
          Ajuste
        </Button>
        {item.usedIn.length === 0 && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => archiveItem(item.id))}
            aria-label={`Archivar ${item.name}`}
            className="ml-auto"
          >
            <ArchiveIcon className="size-4" />
          </Button>
        )}
      </div>
    </li>
  );
}

function ItemEditor({ item, onClose }: { item: Item | "new" | null; onClose: () => void }) {
  const it = item && item !== "new" ? item : null;
  const [state, action, pending] = useActionState(saveItem, initialState);
  useFormResult(state, onClose);
  const fe = state.fieldErrors ?? {};

  return (
    <Sheet open={!!item} onClose={onClose} title={it ? `Editar ${it.name}` : "Nuevo ingrediente"}>
      <form action={action} className="flex flex-col gap-4" noValidate>
        {it ? <input type="hidden" name="id" value={it.id} /> : null}
        <Field label="Nombre" htmlFor="i-name" error={fe.name}>
          <input id="i-name" name="name" defaultValue={it?.name} className={inputClass} aria-invalid={!!fe.name} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Unidad" htmlFor="i-unit" error={fe.unit}>
            <select id="i-unit" name="unit" defaultValue={it?.unit ?? "pieza"} className={inputClass}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="Costo por unidad" htmlFor="i-cost" error={fe.unitCost}>
            <input
              id="i-cost"
              name="unitCost"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              defaultValue={it?.unitCost ?? 0}
              className={inputClass}
            />
          </Field>
          <Field label="Stock mínimo" htmlFor="i-min" error={fe.minStock} hint="Avisa cuando baje de aquí">
            <input
              id="i-min"
              name="minStock"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              defaultValue={it?.minStock ?? 0}
              className={inputClass}
            />
          </Field>
          {!it && (
            <Field label="Stock inicial" htmlFor="i-stock" error={fe.initialStock}>
              <input id="i-stock" name="initialStock" type="number" min="0" step="any" inputMode="decimal" defaultValue={0} className={inputClass} />
            </Field>
          )}
        </div>
        {it ? (
          <p className="text-[13px] text-ink-2">El stock solo cambia con entradas, mermas, ajustes o bebidas entregadas.</p>
        ) : null}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando" : "Guardar"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

const MOVE_COPY: Record<MoveType, { title: string; qty: string; cta: string }> = {
  PURCHASE: { title: "Registrar entrada", qty: "Cantidad que entra", cta: "Registrar entrada" },
  WASTE: { title: "Registrar merma", qty: "Cantidad perdida", cta: "Registrar merma" },
  ADJUSTMENT: { title: "Ajustar por conteo", qty: "Diferencia", cta: "Guardar ajuste" },
};

function MovementEditor({ target, onClose }: { target: { item: Item; type: MoveType } | null; onClose: () => void }) {
  const [state, action, pending] = useActionState(recordMovement, initialState);
  useFormResult(state, onClose);
  const fe = state.fieldErrors ?? {};
  // Conserva el contenido mientras el sheet anima su salida
  const [last, setLast] = useState(target);
  if (target && target !== last) setLast(target);
  const t = target ?? last;
  const copy = t ? MOVE_COPY[t.type] : MOVE_COPY.PURCHASE;

  return (
    <Sheet
      open={!!target}
      onClose={onClose}
      title={copy.title}
      description={t ? `${t.item.name}. Hay ${fmtQty(t.item.stock)} ${t.item.unit}.` : undefined}
    >
      {t && (
        <form action={action} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="itemId" value={t.item.id} />
          <input type="hidden" name="type" value={t.type} />
          {t.type === "ADJUSTMENT" && (
            <fieldset className="grid grid-cols-2 gap-2">
              <legend className="mb-1.5 text-[13px] font-medium text-ink">Sentido</legend>
              {[
                { v: "in", l: "Sobra (sumar)" },
                { v: "out", l: "Falta (restar)" },
              ].map((o, i) => (
                <label
                  key={o.v}
                  className="pressable flex cursor-pointer items-center gap-2 rounded-xl bg-surface-2 px-3.5 py-2.5 text-[14px] text-ink has-[:checked]:bg-accent-soft has-[:checked]:text-accent"
                >
                  <input type="radio" name="direction" value={o.v} defaultChecked={i === 1} className="accent-[var(--accent)]" />
                  {o.l}
                </label>
              ))}
            </fieldset>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label={`${copy.qty} (${t.item.unit})`} htmlFor="m-qty" error={fe.quantity}>
              <input
                id="m-qty"
                name="quantity"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                autoFocus
                className={inputClass}
                aria-invalid={!!fe.quantity}
              />
            </Field>
            {t.type === "PURCHASE" && (
              <Field label="Costo por unidad" htmlFor="m-cost" error={fe.unitCost} hint="Actualiza el costo vigente">
                <input
                  id="m-cost"
                  name="unitCost"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  defaultValue={t.item.unitCost}
                  className={inputClass}
                />
              </Field>
            )}
          </div>
          <Field label="Nota" htmlFor="m-note" error={fe.note} hint="Opcional: proveedor, factura, motivo">
            <input id="m-note" name="note" maxLength={160} className={inputClass} />
          </Field>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando" : copy.cta}
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
