import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { dateLabel } from "@/lib/day";
import { num } from "@/lib/format";
import { InventoryManager } from "./inventory-manager";

export const metadata = { title: "Ingredientes" };

async function InventoryPageContent() {
  await requireAdmin();
  const [items, movements] = await Promise.all([
    db.inventoryItem.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        recipes: {
          where: { drink: { deletedAt: null } },
          select: { quantity: true, drink: { select: { name: true } } },
          orderBy: { drink: { name: "asc" } },
        },
      },
    }),
    db.inventoryMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { item: { select: { name: true, unit: true } }, user: { select: { name: true } } },
    }),
  ]);

  return (
    <InventoryManager
      items={items.map((i) => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
        stock: num(i.stock),
        minStock: num(i.minStock),
        unitCost: num(i.unitCost),
        usedIn: i.recipes.map((r) => ({ drink: r.drink.name, quantity: num(r.quantity) })),
      }))}
      movements={movements.map((m) => ({
        id: m.id,
        type: m.type,
        quantity: num(m.quantity),
        note: m.note,
        when: dateLabel(m.createdAt),
        item: m.item.name,
        unit: m.item.unit,
        by: m.user?.name ?? null,
      }))}
    />
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="grid" />}>
      <InventoryPageContent />
    </Suspense>
  );
}
