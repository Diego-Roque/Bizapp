import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { dayKey, timeLabel, todayLabel } from "@/lib/day";
import { Poller } from "@/components/poller";
import { PageHeader } from "@/components/ui";
import { OrderQueue } from "./order-queue";

export const metadata = { title: "Barra" };

async function BarPageContent() {
  await requireAdmin();
  const today = dayKey();

  const [active, deliveredToday] = await Promise.all([
    db.order.findMany({
      where: { status: { in: ["PENDING", "PREPARING", "READY"] } },
      orderBy: { createdAt: "asc" },
      include: {
        customer: { select: { name: true, company: { select: { name: true } } } },
        drink: { select: { name: true, category: true, imageUrl: true } },
      },
    }),
    db.order.count({ where: { dayKey: today, status: "DELIVERED" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <Poller seconds={6} />
      <PageHeader
        title="Barra"
        subtitle={`${todayLabel()}. ${deliveredToday} ${deliveredToday === 1 ? "bebida entregada" : "bebidas entregadas"} hoy.`}
      />
      <OrderQueue
        orders={active.map((o) => ({
          id: o.id,
          status: o.status as "PENDING" | "PREPARING" | "READY",
          person: o.customer.name,
          company: o.customer.company.name,
          notes: o.notes,
          time: timeLabel(o.createdAt),
          createdAt: o.createdAt.toISOString(),
          stale: o.dayKey !== today,
          drink: o.drink,
        }))}
      />
    </div>
  );
}

export default function BarPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="board" />}>
      <BarPageContent />
    </Suspense>
  );
}
