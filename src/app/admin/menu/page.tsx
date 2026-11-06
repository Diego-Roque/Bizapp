import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { num } from "@/lib/format";
import { storageReady } from "@/lib/storage";
import { MenuManager } from "./menu-manager";

export const metadata = { title: "Menú" };

async function AdminMenuPageContent() {
  await requireAdmin();
  const [drinks, items] = await Promise.all([
    db.drink.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { recipe: { include: { inventoryItem: true } } },
    }),
    db.inventoryItem.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <MenuManager
      storageReady={storageReady()}
      drinks={drinks.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        category: d.category,
        imageUrl: d.imageUrl,
        available: d.status === "AVAILABLE",
        shortOn: d.recipe.filter((r) => num(r.inventoryItem.stock) < num(r.quantity)).map((r) => r.inventoryItem.name),
        // Porciones que alcanzan: las limita el ingrediente más escaso
        servings: d.recipe.length
          ? Math.max(0, Math.min(...d.recipe.map((r) => Math.floor(num(r.inventoryItem.stock) / num(r.quantity)))))
          : null,
        recipe: d.recipe.map((r) => ({
          inventoryItemId: r.inventoryItemId,
          quantity: num(r.quantity),
          name: r.inventoryItem.name,
          unit: r.inventoryItem.unit,
        })),
      }))}
      items={items.map((i) => ({ id: i.id, name: i.name, unit: i.unit }))}
    />
  );
}

export default function AdminMenuPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <AdminMenuPageContent />
    </Suspense>
  );
}
