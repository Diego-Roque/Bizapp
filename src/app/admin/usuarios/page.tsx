import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { dayKey, monthBounds, monthKey, monthLabel } from "@/lib/day";
import { PageHeader } from "@/components/ui";
import { CustomerList, StaffList } from "./people";

export const metadata = { title: "Personas" };

async function PeopleContent() {
  const admin = await requireAdmin();
  const today = dayKey();
  const month = monthKey();
  const { start, end } = monthBounds(month);

  const [customers, staff] = await Promise.all([
    db.customer.findMany({
      where: { orders: { some: { dayKey: { gte: start, lt: end } } } },
      orderBy: [{ company: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        company: true,
        orders: {
          where: { dayKey: { gte: start, lt: end }, status: { not: "CANCELLED" } },
          select: { dayKey: true },
        },
      },
    }),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true, active: true } }),
  ]);

  return (
    <div className="flex flex-col gap-12">
      <PageHeader title="Personas" subtitle={`${customers.length} personas pidieron en ${monthLabel(month).toLowerCase()}`} />
      <CustomerList
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          company: c.company,
          today: c.orders.filter((o) => o.dayKey === today).length,
          month: c.orders.length,
        }))}
      />
      <StaffList meId={admin.id} staff={staff} />
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <PeopleContent />
    </Suspense>
  );
}
