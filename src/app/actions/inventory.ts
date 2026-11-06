"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { UNITS } from "@/lib/config";
import { dayKey } from "@/lib/day";
import { num } from "@/lib/format";
import type { ActionState } from "./types";

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of error.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

function revalidateInventory() {
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

const itemSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Escribe un nombre").max(60),
  unit: z.enum(UNITS, { message: "Elige una unidad" }),
  minStock: z.coerce.number().min(0, "No puede ser negativo"),
  unitCost: z.coerce.number().min(0, "No puede ser negativo"),
  initialStock: z.coerce.number().min(0, "No puede ser negativo").optional(),
});

export async function saveItem(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { id, name, unit, minStock, unitCost, initialStock } = parsed.data;

  if (id) {
    await db.inventoryItem.update({ where: { id }, data: { name, unit, minStock, unitCost } });
  } else {
    const stock = initialStock ?? 0;
    await db.inventoryItem.create({
      data: {
        name,
        unit,
        minStock,
        unitCost,
        stock,
        movements: stock
          ? {
              create: {
                type: "PURCHASE",
                quantity: stock,
                unitCost,
                dayKey: dayKey(),
                userId: admin.id,
                note: "Stock inicial",
              },
            }
          : undefined,
      },
    });
  }
  revalidateInventory();
  return { ok: true, message: id ? "Ingrediente actualizado" : "Ingrediente agregado" };
}

const movementSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(["PURCHASE", "WASTE", "ADJUSTMENT"]),
  quantity: z.coerce.number().positive("Cantidad mayor a 0"),
  // Para ajustes: el conteo físico real
  direction: z.enum(["in", "out"]).optional(),
  unitCost: z.coerce.number().min(0).optional().or(z.literal("")),
  note: z.string().trim().max(160).optional(),
});

export async function recordMovement(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = movementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { itemId, type, quantity, direction, note } = parsed.data;
  const unitCost = parsed.data.unitCost === "" || parsed.data.unitCost == null ? undefined : parsed.data.unitCost;

  const item = await db.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "El ingrediente no existe" };

  // Compra suma; merma resta; ajuste usa la dirección elegida
  const sign = type === "PURCHASE" ? 1 : type === "WASTE" ? -1 : direction === "out" ? -1 : 1;
  const delta = sign * quantity;

  await db.$transaction([
    db.inventoryItem.update({
      where: { id: itemId },
      data: {
        stock: { increment: delta },
        // Una compra con costo actualiza el costo unitario vigente
        ...(type === "PURCHASE" && unitCost != null ? { unitCost } : {}),
      },
    }),
    db.inventoryMovement.create({
      data: {
        itemId,
        type,
        quantity: delta,
        unitCost: unitCost ?? num(item.unitCost),
        dayKey: dayKey(),
        userId: admin.id,
        note: note || null,
      },
    }),
  ]);

  revalidateInventory();
  revalidatePath("/admin/reporte");
  const label = type === "PURCHASE" ? "Entrada registrada" : type === "WASTE" ? "Merma registrada" : "Ajuste registrado";
  return { ok: true, message: label };
}

export async function archiveItem(itemId: string): Promise<ActionState> {
  await requireAdmin();
  const inRecipes = await db.recipeItem.count({ where: { inventoryItemId: itemId, drink: { deletedAt: null } } });
  if (inRecipes > 0) return { error: "Quítalo primero de las recetas que lo usan" };
  await db.inventoryItem.update({ where: { id: itemId }, data: { active: false } });
  revalidateInventory();
  return { ok: true, message: "Ingrediente archivado" };
}

const quickSchema = z.object({
  name: z.string().trim().min(2, "Escribe un nombre").max(60),
  unit: z.enum(UNITS, { message: "Elige una unidad" }),
});

/** Alta rápida desde el editor de recetas: nombre y unidad; stock y costo se completan en Ingredientes */
export async function quickCreateIngredient(input: {
  name: string;
  unit: string;
}): Promise<ActionState & { item?: { id: string; name: string; unit: string } }> {
  await requireAdmin();
  const parsed = quickSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const existing = await db.inventoryItem.findFirst({
    where: { active: true, name: { equals: parsed.data.name, mode: "insensitive" } },
  });
  if (existing) return { ok: true, item: { id: existing.id, name: existing.name, unit: existing.unit } };

  const item = await db.inventoryItem.create({ data: { name: parsed.data.name, unit: parsed.data.unit } });
  revalidatePath("/admin/inventario");
  return { ok: true, message: `${item.name} agregado a ingredientes`, item: { id: item.id, name: item.name, unit: item.unit } };
}
