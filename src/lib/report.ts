import "server-only";
import { db } from "./db";
import { monthBounds } from "./day";
import { num } from "./format";

export async function getMonthlyReport(month: string) {
  const { start, end } = monthBounds(month);
  const inMonth = { gte: start, lt: end };

  const [orders, items, monthMovements, laterMovements] = await Promise.all([
    db.order.findMany({
      where: { dayKey: inMonth },
      select: { status: true, dayKey: true, customerId: true, customer: { select: { company: true } }, drink: { select: { id: true, name: true, category: true } } },
    }),
    db.inventoryItem.findMany({ orderBy: { name: "asc" } }),
    db.inventoryMovement.findMany({ where: { dayKey: inMonth }, select: { itemId: true, type: true, quantity: true, unitCost: true } }),
    // Movimientos posteriores al cierre del mes: sirven para reconstruir el stock de cierre
    db.inventoryMovement.groupBy({ by: ["itemId"], where: { dayKey: { gte: end } }, _sum: { quantity: true } }),
  ]);

  // Pedidos
  const delivered = orders.filter((o) => o.status === "DELIVERED");
  const cancelled = orders.filter((o) => o.status === "CANCELLED").length;
  const people = new Set(delivered.map((o) => o.customerId)).size;

  const byCompanyMap = new Map<string, { company: string; delivered: number; people: Set<string> }>();
  for (const o of delivered) {
    const row = byCompanyMap.get(o.customer.company) ?? { company: o.customer.company, delivered: 0, people: new Set<string>() };
    row.delivered += 1;
    row.people.add(o.customerId);
    byCompanyMap.set(o.customer.company, row);
  }
  const companies = [...byCompanyMap.values()]
    .map((c) => ({ company: c.company, delivered: c.delivered, people: c.people.size }))
    .sort((a, b) => b.delivered - a.delivered);

  const byDrink = new Map<string, { name: string; category: string; delivered: number }>();
  for (const o of delivered) {
    const row = byDrink.get(o.drink.id) ?? { name: o.drink.name, category: o.drink.category, delivered: 0 };
    row.delivered += 1;
    byDrink.set(o.drink.id, row);
  }
  const drinks = [...byDrink.values()].sort((a, b) => b.delivered - a.delivered);

  const byDay = new Map<string, number>();
  for (const o of delivered) byDay.set(o.dayKey, (byDay.get(o.dayKey) ?? 0) + 1);
  const daysInMonth = Number(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate());
  const daily = Array.from({ length: daysInMonth }, (_, i) => {
    const key = `${month}-${String(i + 1).padStart(2, "0")}`;
    return { day: i + 1, key, count: byDay.get(key) ?? 0 };
  });

  // Inventario
  const later = new Map(laterMovements.map((m) => [m.itemId, num(m._sum.quantity)]));
  const agg = new Map<string, { purchases: number; purchaseCost: number; consumption: number; consumptionCost: number; waste: number; adjustments: number }>();
  for (const m of monthMovements) {
    const a = agg.get(m.itemId) ?? { purchases: 0, purchaseCost: 0, consumption: 0, consumptionCost: 0, waste: 0, adjustments: 0 };
    const q = num(m.quantity);
    const cost = num(m.unitCost);
    if (m.type === "PURCHASE") {
      a.purchases += q;
      a.purchaseCost += q * cost;
    } else if (m.type === "CONSUMPTION") {
      a.consumption += -q;
      a.consumptionCost += -q * cost;
    } else if (m.type === "WASTE") a.waste += -q;
    else a.adjustments += q;
    agg.set(m.itemId, a);
  }

  const inventory = items
    .map((it) => {
      const a = agg.get(it.id) ?? { purchases: 0, purchaseCost: 0, consumption: 0, consumptionCost: 0, waste: 0, adjustments: 0 };
      const closing = num(it.stock) - (later.get(it.id) ?? 0);
      const opening = closing - a.purchases + a.consumption + a.waste - a.adjustments;
      return { id: it.id, name: it.name, unit: it.unit, active: it.active, opening, closing, ...a };
    })
    // Archivados sin actividad en el mes no aportan al reporte
    .filter((r) => r.active || r.purchases || r.consumption || r.waste || r.adjustments);

  const totals = {
    delivered: delivered.length,
    cancelled,
    people,
    purchaseCost: inventory.reduce((s, r) => s + r.purchaseCost, 0),
    consumptionCost: inventory.reduce((s, r) => s + r.consumptionCost, 0),
  };

  return { month, totals, drinks, companies, daily, inventory };
}

export type MonthlyReport = Awaited<ReturnType<typeof getMonthlyReport>>;
