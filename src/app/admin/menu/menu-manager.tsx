"use client";

import { useActionState, useEffect, useState } from "react";
import { PencilSimpleIcon, PlusIcon, TrashIcon, CoffeeIcon, WarningIcon } from "@phosphor-icons/react";
import { deleteDrink, saveDrink, setDrinkAvailability } from "@/app/actions/menu";
import { quickCreateIngredient } from "@/app/actions/inventory";
import { PhotoPicker, type PhotoState } from "./photo-picker";
import { initialState } from "@/app/actions/types";
import { DRINK_CATEGORIES, UNITS } from "@/lib/config";
import { DrinkArt } from "@/components/drink-art";
import { Sheet } from "@/components/sheet";
import { Switch } from "@/components/switch";
import { useAction } from "@/components/toaster";
import { useFormResult } from "@/components/use-form-result";
import { Badge, Button, EmptyState, Field, PageHeader, cn, inputClass } from "@/components/ui";

type RecipeRow = { inventoryItemId: string; quantity: number; name?: string; unit?: string };
type AdminDrink = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  available: boolean;
  shortOn: string[];
  servings: number | null;
  recipe: RecipeRow[];
};
type Item = { id: string; name: string; unit: string };

export function MenuManager({ drinks, items, storageReady }: { drinks: AdminDrink[]; items: Item[]; storageReady: boolean }) {
  const [editing, setEditingRaw] = useState<AdminDrink | "new" | null>(null);
  // Nueva "sesión" de formulario en cada apertura; al cerrar se conserva para que el sheet anime su salida
  const [session, setSession] = useState(0);
  const setEditing = (v: AdminDrink | "new" | null) => {
    if (v) setSession((s) => s + 1);
    setEditingRaw(v);
  };
  const available = drinks.filter((d) => d.available).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Menú"
        subtitle={`${available} de ${drinks.length} bebidas disponibles para pedir`}
        actions={
          <Button onClick={() => setEditing("new")}>
            <PlusIcon className="size-4" weight="bold" />
            Nueva bebida
          </Button>
        }
      />

      {drinks.length === 0 ? (
        <EmptyState
          icon={<CoffeeIcon className="size-6" />}
          title="Todavía no hay bebidas"
          body="Agrega la primera. Si le pones receta, el inventario se descuenta solo al entregarla."
          action={<Button onClick={() => setEditing("new")}>Nueva bebida</Button>}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-[20px] bg-surface shadow-card">
          {drinks.map((d) => (
            <DrinkRow key={d.id} drink={d} onEdit={() => setEditing(d)} />
          ))}
        </ul>
      )}

      <DrinkEditor
        key={session}
        drink={editing}
        items={items}
        storageReady={storageReady}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function DrinkRow({ drink, onEdit }: { drink: AdminDrink; onEdit: () => void }) {
  const [pending, run] = useAction();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3500);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <DrinkArt
          category={drink.category}
          imageUrl={drink.imageUrl}
          name={drink.name}
          className={cn("size-14 shrink-0 rounded-[14px]", !drink.available && "opacity-40 grayscale")}
          iconClassName="size-7"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{drink.name}</p>
            <Badge>{drink.category}</Badge>
            {!drink.available && <Badge tone="warn">Agotada</Badge>}
            {drink.available && drink.shortOn.length > 0 && (
              <Badge tone="danger">
                <WarningIcon className="size-3.5" weight="bold" />
                Falta {drink.shortOn[0]}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-[13px] text-ink-2">
            {drink.recipe.length
              ? drink.recipe.map((r) => `${r.quantity} ${r.unit} ${r.name}`).join(", ")
              : "Sin ingredientes: no descuenta inventario"}
          </p>
          {drink.servings != null && drink.servings > 0 && (
            <p className={cn("mt-0.5 text-[13px]", drink.servings <= 5 ? "text-warn" : "text-ink-2")}>
              Alcanza para <span className="font-mono font-medium tabular-nums">{drink.servings}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <label className="flex items-center gap-2 text-[14px] text-ink-2">
          <Switch
            checked={drink.available}
            disabled={pending}
            label={`${drink.name} disponible`}
            onChange={(v) => run(() => setDrinkAvailability(drink.id, v))}
          />
          <span className="w-20">{drink.available ? "Disponible" : "Agotada"}</span>
        </label>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Editar ${drink.name}`}>
            <PencilSimpleIcon className="size-4" />
            <span className="hidden lg:inline">Editar</span>
          </Button>
          {confirming ? (
            <Button variant="danger" size="sm" disabled={pending} onClick={() => run(() => deleteDrink(drink.id))}>
              Confirmar
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} aria-label={`Eliminar ${drink.name}`}>
              <TrashIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

function DrinkEditor({
  drink,
  items,
  storageReady,
  onClose,
}: {
  drink: AdminDrink | "new" | null;
  items: Item[];
  storageReady: boolean;
  onClose: () => void;
}) {
  const isNew = drink === "new";
  const d = drink && drink !== "new" ? drink : null;
  const [state, action, pending] = useActionState(saveDrink, initialState);
  const [recipe, setRecipe] = useState<RecipeRow[]>(d?.recipe ?? []);
  const [category, setCategory] = useState(d?.category ?? "Café");
  const [name, setName] = useState(d?.name ?? "");
  const [photo, setPhoto] = useState<PhotoState>({ file: null, removed: false });
  const fe = state.fieldErrors ?? {};

  useFormResult(state, onClose);

  const [known, setKnown] = useState<Item[]>(items);
  const unused = known.filter((i) => !recipe.some((r) => r.inventoryItemId === i.id));

  return (
    <Sheet
      open={!!drink}
      onClose={onClose}
      title={isNew ? "Nueva bebida" : `Editar ${d?.name ?? ""}`}
      description="Los ingredientes se descuentan del inventario cada vez que se entrega."
    >
      <form
        action={(fd) => {
          if (photo.file) fd.set("image", photo.file);
          else if (photo.removed) fd.set("removeImage", "1");
          action(fd);
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        {d ? <input type="hidden" name="id" value={d.id} /> : null}
        <input type="hidden" name="recipe" value={JSON.stringify(recipe)} />

        <PhotoPicker
          current={d?.imageUrl ?? null}
          category={category}
          name={name}
          ready={storageReady}
          error={fe.image}
          onChange={setPhoto}
        />
        <Field label="Nombre" htmlFor="name" error={fe.name}>
          <input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass}
            aria-invalid={!!fe.name}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
          <Field label="Categoría" htmlFor="category" error={fe.category}>
            <select
              id="category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              {DRINK_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Descripción" htmlFor="description" error={fe.description} hint="Opcional, se muestra en el menú">
            <input id="description" name="description" defaultValue={d?.description ?? ""} maxLength={160} className={inputClass} />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-1.5 text-[13px] font-medium text-ink">Ingredientes por bebida</legend>
          {recipe.length === 0 && (
            <p className="text-[13px] text-ink-2">Sin ingredientes. La bebida no descontará inventario.</p>
          )}
          {recipe.map((r, idx) => {
            const item = known.find((i) => i.id === r.inventoryItemId);
            return (
              <div key={r.inventoryItemId} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{item?.name ?? r.name}</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  aria-label={`Cantidad de ${item?.name ?? r.name}`}
                  value={r.quantity}
                  onChange={(e) =>
                    setRecipe((rows) => rows.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value) } : x)))
                  }
                  className={cn(inputClass, "h-10 w-24 text-right tabular-nums")}
                />
                <span className="w-14 text-[13px] text-ink-2">{item?.unit ?? r.unit}</span>
                <button
                  type="button"
                  onClick={() => setRecipe((rows) => rows.filter((_, i) => i !== idx))}
                  aria-label={`Quitar ${item?.name ?? r.name}`}
                  className="pressable grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-danger"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            );
          })}
          <AddIngredient
            options={unused}
            onAdd={(item) => {
              setKnown((k) => (k.some((x) => x.id === item.id) ? k : [...k, item]));
              setRecipe((rows) =>
                rows.some((r) => r.inventoryItemId === item.id) ? rows : [...rows, { inventoryItemId: item.id, quantity: 1 }],
              );
            }}
          />
          {fe.recipe ? <p className="text-[13px] text-danger">{fe.recipe}</p> : null}
        </fieldset>

        {state.error ? <p className="text-[14px] text-danger">{state.error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando" : isNew ? "Agregar al menú" : "Guardar"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function AddIngredient({ options, onAdd }: { options: Item[]; onAdd: (item: Item) => void }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<string>("ml");
  const [pending, run] = useAction();

  if (!creating) {
    return (
      <select
        aria-label="Agregar ingrediente"
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__new") setCreating(true);
          else {
            const item = options.find((o) => o.id === v);
            if (item) onAdd(item);
          }
        }}
        className={cn(inputClass, "text-ink-2")}
      >
        <option value="">Agregar ingrediente</option>
        {options.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name} ({i.unit})
          </option>
        ))}
        <option value="__new">+ Nuevo ingrediente</option>
      </select>
    );
  }

  const submit = () =>
    run(
      () => quickCreateIngredient({ name, unit }),
      (r) => {
        const res = r as Awaited<ReturnType<typeof quickCreateIngredient>>;
        if (res.ok && res.item) {
          onAdd(res.item);
          setName("");
          setCreating(false);
        }
      },
    );

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
      <p className="text-[13px] font-medium text-ink">Nuevo ingrediente</p>
      <div className="flex gap-2">
        <input
          aria-label="Nombre del ingrediente"
          placeholder="Ej. Jarabe de vainilla"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            // Enter crea el ingrediente en vez de enviar el formulario de la bebida
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          className={cn(inputClass, "h-10 min-w-0 flex-1")}
        />
        <select aria-label="Unidad" value={unit} onChange={(e) => setUnit(e.target.value)} className={cn(inputClass, "h-10 w-24")}>
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </div>
      <p className="text-[12px] text-ink-2">El stock y el costo los registras después en Ingredientes.</p>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
          Cancelar
        </Button>
        <Button type="button" size="sm" disabled={pending || name.trim().length < 2} onClick={submit}>
          {pending ? "Creando" : "Crear y agregar"}
        </Button>
      </div>
    </div>
  );
}
