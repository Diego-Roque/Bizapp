"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BellRingingIcon, CheckIcon, MagnifyingGlassIcon, PintGlassIcon } from "@phosphor-icons/react";
import { checkAllowance, placeOrder, undoOrder } from "@/app/actions/orders";
import type { MenuDrink } from "@/lib/menu";
import { DrinkArt } from "@/components/drink-art";
import { Sheet } from "@/components/sheet";
import { useAction } from "@/components/toaster";
import { useMedia } from "@/components/use-media";
import { Button, EmptyState, cn } from "@/components/ui";

const IDLE_RESET_MS = 60_000; // si alguien se va a medias, el iPad se limpia solo
const CONFIRM_RESET_S = 8;
const spring = { type: "spring" as const, bounce: 0, duration: 0.4 };

type Ready = { id: string; name: string; drink: string };
type Done = { orderId: string; drink: MenuDrink; name: string; remaining: number };

export function Kiosk({
  today,
  limit,
  drinks,
  companies,
  ready,
}: {
  today: string;
  limit: number;
  drinks: MenuDrink[];
  companies: string[];
  ready: Ready[];
}) {
  const wide = useMedia("(min-width: 1024px)");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [selected, setSelected] = useState<MenuDrink | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const whoComplete = company.trim().length >= 2 && name.trim().length >= 2;

  const reset = useCallback(() => {
    setCompany("");
    setName("");
    setNotes("");
    setRemaining(null);
    setSelected(null);
    setSheetOpen(false);
    setDone(null);
  }, []);

  // Cupo restante: se consulta al terminar de escribir
  useEffect(() => {
    if (!whoComplete) return;
    let alive = true;
    const t = setTimeout(async () => {
      const r = await checkAllowance({ company, name });
      if (alive && !("fieldErrors" in r)) setRemaining(r.remaining);
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [company, name, whoComplete]);

  // Reinicio por inactividad
  const dirty = company !== "" || name !== "" || notes !== "" || selected !== null;
  useEffect(() => {
    if (!dirty || done) return;
    let t = setTimeout(reset, IDLE_RESET_MS);
    const bump = () => {
      clearTimeout(t);
      t = setTimeout(reset, IDLE_RESET_MS);
    };
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
    };
  }, [dirty, done, reset]);

  function pick(d: MenuDrink) {
    setSelected(d);
    if (!wide) setSheetOpen(true);
  }

  const form = (
    <OrderForm
      key={done?.orderId ?? "form"}
      companies={companies}
      company={company}
      name={name}
      notes={notes}
      onCompany={(v) => {
        setCompany(v);
        setRemaining(null);
      }}
      onName={(v) => {
        setName(v);
        setRemaining(null);
      }}
      onNotes={setNotes}
      remaining={whoComplete ? remaining : null}
      limit={limit}
      drink={selected}
      showDrink={wide}
      onPlaced={(orderId, rem) => {
        if (!selected) return;
        setSheetOpen(false);
        setDone({ orderId, drink: selected, name: name.trim().split(" ")[0], remaining: rem });
      }}
    />
  );

  return (
    <main className="flex-1">
      <div className="mx-auto grid w-full max-w-[1240px] gap-8 px-4 pt-8 pb-36 md:px-8 md:pt-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        <section aria-labelledby="menu-title" className="flex min-w-0 flex-col gap-6">
          <div>
            <p className="t-eyebrow text-accent">{today}</p>
            <h1 id="menu-title" className="t-display mt-2 text-ink">
              ¿Qué se te antoja?
            </h1>
            <p className="mt-2 text-[17px] text-ink-2">
              Elige tu bebida, escribe tu nombre y la recoges en la barra.
            </p>
          </div>
          <MenuGrid drinks={drinks} selectedId={wide ? selected?.id : undefined} onPick={pick} />
        </section>

        {wide && (
          <aside aria-label="Tu pedido" className="hidden lg:block">
            <div className="sticky top-24 rounded-[28px] bg-surface p-5 shadow-card">
              <h2 className="t-title mb-5 text-ink">Tu pedido</h2>
              {form}
            </div>
          </aside>
        )}
      </div>

      {!wide && (
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={selected?.name ?? "Tu pedido"} description={selected?.description ?? undefined}>
          {selected && (
            <DrinkArt
              category={selected.category}
              imageUrl={selected.imageUrl}
              name={selected.name}
              className="mb-5 aspect-[16/9] w-full rounded-[20px]"
              iconClassName="size-16"
            />
          )}
          {form}
        </Sheet>
      )}

      <Confirmation done={done} onReset={reset} />
      <ReadyStrip ready={ready} />
    </main>
  );
}

/* ---------- Formulario del pedido (panel en iPad horizontal, hoja en vertical/celular) ---------- */

function OrderForm({
  companies,
  company,
  name,
  notes,
  onCompany,
  onName,
  onNotes,
  remaining,
  limit,
  drink,
  showDrink,
  onPlaced,
}: {
  companies: string[];
  company: string;
  name: string;
  notes: string;
  onCompany: (v: string) => void;
  onName: (v: string) => void;
  onNotes: (v: string) => void;
  remaining: number | null;
  limit: number;
  drink: MenuDrink | null;
  showDrink: boolean;
  onPlaced: (orderId: string, remaining: number) => void;
}) {
  const [pending, run] = useAction();
  const whoComplete = company.trim().length >= 2 && name.trim().length >= 2;
  const blocked = !whoComplete ? "Escribe tu compañía y tu nombre" : !drink ? "Elige una bebida del menú" : remaining === 0 ? "Ya usaste tus bebidas de hoy. Mañana se renueva." : null;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (blocked || !drink) return;
        run(
          () => placeOrder({ company, name, drinkId: drink.id, notes }),
          (r) => {
            const res = r as Awaited<ReturnType<typeof placeOrder>>;
            if (res.ok && res.orderId) onPlaced(res.orderId, res.remaining ?? 0);
          },
        );
      }}
    >
      <div className="flex flex-col gap-3">
        <GroupedFields
          companies={companies}
          rows={[
            { label: "Compañía", value: company, onChange: onCompany, autoComplete: "organization", placeholder: "Dónde trabajas", list: true },
            { label: "Nombre", value: name, onChange: onName, autoComplete: "name", placeholder: "Nombre y apellido" },
          ]}
        />
        <Allowance remaining={remaining} limit={limit} />
      </div>

      {showDrink && <SelectedDrink drink={drink} />}

      <div className="flex flex-col gap-2">
        <label htmlFor="notes" className="px-1 text-[13px] font-medium text-ink-2">
          Indicaciones para la barra (opcional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Sin azúcar, con hielo, leche deslactosada"
          className="w-full resize-none rounded-2xl bg-surface-2 px-4 py-3 text-[16px] text-ink outline-none placeholder:text-ink-2 focus:ring-2 focus:ring-accent focus-visible:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Button type="submit" size="lg" disabled={pending || !!blocked} className="h-14 w-full text-[17px] font-semibold">
          {pending ? "Enviando" : drink && !blocked ? `Pedir ${drink.name}` : "Pedir"}
        </Button>
        <p className="min-h-5 text-center text-[13px] text-ink-2" aria-live="polite">
          {blocked ?? ""}
        </p>
      </div>
    </form>
  );
}

function GroupedFields({
  rows,
  companies,
}: {
  companies: string[];
  rows: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    autoComplete: string;
    placeholder: string;
    list?: boolean;
  }[];
}) {
  return (
    // Campos agrupados como en Ajustes de iOS: un solo contenedor, separadores con sangría
    <div className="overflow-hidden rounded-2xl bg-surface-2 focus-within:ring-2 focus-within:ring-accent">
      {rows.map((r, i) => (
        <div key={r.label}>
          {i > 0 && <div className="ml-4 h-px bg-line" />}
          <label className="flex h-[52px] items-center gap-3 px-4">
            <span className="w-[5.25rem] shrink-0 text-[15px] text-ink">{r.label}</span>
            <input
              value={r.value}
              onChange={(e) => r.onChange(e.target.value)}
              list={r.list && companies.length ? "kiosk-companies" : undefined}
              autoComplete={r.autoComplete}
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              maxLength={60}
              placeholder={r.placeholder}
              className="h-full min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-ink-2 focus-visible:outline-none"
            />
          </label>
        </div>
      ))}
      {companies.length > 0 && (
        <datalist id="kiosk-companies">
          {companies.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      )}
    </div>
  );
}

function Allowance({ remaining, limit }: { remaining: number | null; limit: number }) {
  const used = remaining == null ? 0 : limit - remaining;
  return (
    <div className="flex items-center gap-3 px-1" aria-live="polite">
      <span className="flex" aria-hidden>
        {Array.from({ length: limit }, (_, i) => (
          <PintGlassIcon
            key={i}
            weight={remaining != null && i >= used ? "fill" : "regular"}
            className={cn(
              "-mx-0.5 size-6 transition-colors duration-300",
              remaining == null ? "text-ink-2/40" : i >= used ? "text-accent" : "text-ink-2/40",
            )}
          />
        ))}
      </span>
      <p className="text-[15px] text-ink-2">
        {remaining == null ? (
          `${limit} bebidas por persona al día`
        ) : remaining === 0 ? (
          <span className="font-medium text-danger">Cupo de hoy completo</span>
        ) : (
          <>
            <span className="font-semibold text-ink">
              Te {remaining === 1 ? "queda 1 bebida" : `quedan ${remaining} bebidas`}
            </span>{" "}
            hoy
          </>
        )}
      </p>
    </div>
  );
}

function SelectedDrink({ drink }: { drink: MenuDrink | null }) {
  const reduce = useReducedMotion();
  return (
    <div className="min-h-[84px]">
      <AnimatePresence mode="popLayout" initial={false}>
        {drink ? (
          <motion.div
            key={drink.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={spring}
            className="flex items-center gap-4 rounded-2xl bg-surface-2 p-3"
          >
            <DrinkArt
              category={drink.category}
              imageUrl={drink.imageUrl}
              name={drink.name}
              className="size-[60px] shrink-0 rounded-[16px]"
              iconClassName="size-7"
            />
            <div className="min-w-0">
              <p className="truncate text-[17px] font-semibold tracking-[-0.01em] text-ink">{drink.name}</p>
              <p className="truncate text-[14px] text-ink-2">{drink.description || drink.category}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid h-[84px] place-items-center rounded-2xl border border-dashed border-line text-[15px] text-ink-2"
          >
            Toca una bebida del menú
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Menú ---------- */

function MenuGrid({
  drinks,
  selectedId,
  onPick,
}: {
  drinks: MenuDrink[];
  selectedId?: string;
  onPick: (d: MenuDrink) => void;
}) {
  const [category, setCategory] = useState("Todo");
  const reduce = useReducedMotion();
  const categories = useMemo(() => ["Todo", ...new Set(drinks.map((d) => d.category))], [drinks]);
  const visible = category === "Todo" ? drinks : drinks.filter((d) => d.category === category);

  if (drinks.length === 0) {
    return (
      <EmptyState
        icon={<MagnifyingGlassIcon className="size-6" />}
        title="El menú está vacío"
        body="La barra todavía no publica bebidas. Vuelve en un rato."
      />
    );
  }

  return (
    <>
      {categories.length > 2 && (
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          {/* Control segmentado estilo iOS */}
          <div role="tablist" aria-label="Categorías" className="inline-flex rounded-full bg-surface-2 p-1">
            {categories.map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={category === c}
                onClick={() => setCategory(c)}
                className={cn(
                  "relative shrink-0 rounded-full px-4 py-1.5 text-[15px] font-medium whitespace-nowrap transition-colors",
                  category === c ? "text-ink" : "text-ink-2 hover:text-ink",
                )}
              >
                {category === c && (
                  <motion.span
                    layoutId="seg"
                    className="absolute inset-0 rounded-full bg-surface shadow-card"
                    transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                  />
                )}
                <span className="relative">{c}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-4">
        {visible.map((d, i) => {
          const isSelected = d.id === selectedId;
          return (
            <motion.li
              key={d.id}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: Math.min(i, 8) * 0.035 }}
            >
              <button
                type="button"
                onClick={() => onPick(d)}
                disabled={!d.orderable}
                aria-pressed={selectedId !== undefined ? isSelected : undefined}
                className="pressable group block w-full text-left disabled:cursor-not-allowed"
              >
                <div
                  className={cn(
                    "relative overflow-hidden rounded-[24px] shadow-card transition-[box-shadow] duration-200",
                    isSelected && "ring-[3px] ring-accent ring-offset-[3px] ring-offset-bg",
                  )}
                >
                  <DrinkArt
                    category={d.category}
                    imageUrl={d.imageUrl}
                    name={d.name}
                    className={cn(
                      "aspect-square w-full transition-[filter,opacity] duration-300",
                      !d.orderable && "opacity-35 grayscale",
                    )}
                    iconClassName="size-14 sm:size-16"
                  />
                  <AnimatePresence>
                    {isSelected && (
                      <motion.span
                        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ type: "spring", bounce: 0.3, duration: 0.35 }}
                        className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-white text-[#c4480f] shadow-[0_2px_8px_rgb(0_0_0/0.25)]"
                      >
                        <CheckIcon className="size-4" weight="bold" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {!d.orderable && (
                    <span className="glass absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[12px] font-semibold text-ink">
                      {d.reason ?? "Agotada"}
                    </span>
                  )}
                </div>
                <p className="mt-2.5 px-0.5 text-[16px] font-semibold tracking-[-0.01em] text-ink">{d.name}</p>
                <p className="line-clamp-1 px-0.5 text-[14px] text-ink-2">{d.description || d.category}</p>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </>
  );
}

/* ---------- Confirmación ---------- */

function Confirmation({ done, onReset }: { done: Done | null; onReset: () => void }) {
  const reduce = useReducedMotion();
  const [pending, run] = useAction();
  const [left, setLeft] = useState(CONFIRM_RESET_S);
  const [last, setLast] = useState(done);
  if (done && done !== last) {
    setLast(done);
    setLeft(CONFIRM_RESET_S);
  }

  useEffect(() => {
    if (!done) return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [done]);

  useEffect(() => {
    if (done && left <= 0) onReset();
  }, [done, left, onReset]);

  const d = done ?? last;
  return (
    <AnimatePresence>
      {done && d && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="done-title"
          className="fixed inset-0 z-[65] grid place-items-center bg-bg/80 px-6 backdrop-blur-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="flex max-w-md flex-col items-center text-center"
            initial={reduce ? false : { scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.55 }}
          >
            <div className="relative">
              <DrinkArt
                category={d.drink.category}
                imageUrl={d.drink.imageUrl}
                name={d.drink.name}
                className="size-28 rounded-[30px] shadow-float"
                iconClassName="size-14"
              />
              <motion.span
                initial={reduce ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.5, delay: 0.15 }}
                className="absolute -right-2 -bottom-2 grid size-10 place-items-center rounded-full bg-ok text-white ring-4 ring-bg"
              >
                <CheckIcon className="size-5" weight="bold" />
              </motion.span>
            </div>
            <h2 id="done-title" className="t-display mt-7 text-ink">
              Listo, {d.name}
            </h2>
            <p className="mt-3 text-[19px] leading-snug text-ink-2">
              Tu {d.drink.name} ya está en la barra. Cuando esté listo aparece abajo en esta pantalla.
            </p>
            <p className="mt-2 text-[15px] text-ink-2">
              {d.remaining === 0
                ? "Era tu última bebida de hoy."
                : `Te ${d.remaining === 1 ? "queda 1 bebida" : `quedan ${d.remaining} bebidas`} hoy.`}
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button
                variant="secondary"
                size="lg"
                disabled={pending}
                onClick={() => run(() => undoOrder(d.orderId), (r) => r.ok && onReset())}
              >
                Deshacer
              </Button>
              <Button size="lg" onClick={onReset} className="min-w-36">
                Listo
                <span className="font-mono text-[14px] opacity-70 tabular-nums">{Math.max(0, left)}</span>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Listos para recoger ---------- */

function ReadyStrip({ ready }: { ready: Ready[] }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {ready.length > 0 && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { y: "100%" }}
          animate={reduce ? { opacity: 1 } : { y: 0 }}
          exit={reduce ? { opacity: 0 } : { y: "100%" }}
          transition={spring}
          className="glass fixed inset-x-0 bottom-0 z-30 border-t border-line pb-[env(safe-area-inset-bottom)]"
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-4 py-3.5 md:px-8">
            <p className="flex shrink-0 items-center gap-2 text-[15px] font-semibold text-ok">
              <BellRingingIcon className="size-5" weight="fill" />
              Listos para recoger
            </p>
            <ul className="no-scrollbar flex gap-2 overflow-x-auto">
              <AnimatePresence initial={false}>
                {ready.map((o) => (
                  <motion.li
                    key={o.id}
                    layout={!reduce}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={spring}
                    className="shrink-0 rounded-full bg-surface px-4 py-2 text-[15px] whitespace-nowrap shadow-card"
                  >
                    <span className="font-semibold text-ink">{o.name}</span>
                    <span className="text-ink-2">, {o.drink}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
