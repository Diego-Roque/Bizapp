"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { DRINK_CATEGORIES } from "@/lib/config";
import { StorageError, removeDrinkImage, uploadDrinkImage } from "@/lib/storage";
import type { ActionState } from "./types";

const recipeSchema = z.array(
  z.object({ inventoryItemId: z.string().min(1), quantity: z.coerce.number().positive("Cantidad mayor a 0") }),
);

const drinkSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Escribe un nombre").max(60),
  description: z.string().trim().max(160).optional(),
  category: z.enum(DRINK_CATEGORIES, { message: "Elige una categoría" }),
  recipe: z.string().optional(),
});

function revalidateMenu() {
  revalidatePath("/");
  revalidatePath("/admin/menu");
}

export async function saveDrink(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  // El archivo de la foto se procesa aparte; zod solo valida los campos de texto
  const parsed = drinkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors };
  }
  const { id, name, description, category } = parsed.data;

  let recipe: z.infer<typeof recipeSchema> = [];
  try {
    const r = recipeSchema.safeParse(JSON.parse(parsed.data.recipe || "[]"));
    if (!r.success) return { fieldErrors: { recipe: r.error.issues[0]?.message ?? "Receta inválida" } };
    recipe = r.data;
  } catch {
    return { fieldErrors: { recipe: "Receta inválida" } };
  }
  // Cada ingrediente una sola vez por receta
  const unique = new Map(recipe.map((r) => [r.inventoryItemId, r.quantity]));

  const recipeRows = [...unique].map(([inventoryItemId, quantity]) => ({ inventoryItemId, quantity }));

  // Foto: nueva (se sube a Supabase Storage), quitar, o se queda la que había
  const previous = id ? (await db.drink.findUnique({ where: { id }, select: { imageUrl: true } }))?.imageUrl : null;
  const file = formData.get("image");
  let imageUrl = previous ?? null;
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await uploadDrinkImage(file);
    } catch (e) {
      if (e instanceof StorageError) return { fieldErrors: { image: e.message } };
      throw e;
    }
  } else if (formData.get("removeImage") === "1") {
    imageUrl = null;
  }

  const data = { name, description: description || null, category, imageUrl };

  if (id) {
    await db.$transaction([
      db.drink.update({ where: { id }, data }),
      db.recipeItem.deleteMany({ where: { drinkId: id } }),
      db.recipeItem.createMany({ data: recipeRows.map((r) => ({ ...r, drinkId: id })) }),
    ]);
  } else {
    await db.drink.create({ data: { ...data, recipe: { create: recipeRows } } });
  }
  if (previous && previous !== imageUrl) await removeDrinkImage(previous);

  revalidateMenu();
  return { ok: true, message: id ? "Bebida actualizada" : "Bebida agregada al menú" };
}

export async function setDrinkAvailability(drinkId: string, available: boolean): Promise<ActionState> {
  await requireAdmin();
  await db.drink.update({ where: { id: drinkId }, data: { status: available ? "AVAILABLE" : "UNAVAILABLE" } });
  revalidateMenu();
  return { ok: true, message: available ? "De vuelta en el menú" : "Marcada como agotada" };
}

export async function deleteDrink(drinkId: string): Promise<ActionState> {
  await requireAdmin();
  const orders = await db.order.count({ where: { drinkId } });
  if (orders > 0) {
    // Tiene historial: se oculta del menú pero los reportes la siguen contando
    await db.drink.update({ where: { id: drinkId }, data: { deletedAt: new Date() } });
  } else {
    const drink = await db.drink.delete({ where: { id: drinkId } });
    await removeDrinkImage(drink.imageUrl);
  }
  revalidateMenu();
  return { ok: true, message: "Bebida eliminada del menú" };
}
