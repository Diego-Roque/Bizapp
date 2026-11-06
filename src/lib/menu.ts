import "server-only";
import { db } from "./db";
import { num } from "./format";

/** Menú visible para empleados, con disponibilidad calculada por stock de receta */
export async function getMenu() {
  const drinks = await db.drink.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { recipe: { include: { inventoryItem: true } } },
  });

  return drinks.map((d) => {
    const short = d.recipe.filter((r) => num(r.inventoryItem.stock) < num(r.quantity));
    const orderable = d.status === "AVAILABLE" && short.length === 0;
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      category: d.category,
      imageUrl: d.imageUrl,
      status: d.status,
      orderable,
      reason: d.status !== "AVAILABLE" || short.length ? "Agotada" : null,
    };
  });
}

export type MenuDrink = Awaited<ReturnType<typeof getMenu>>[number];
