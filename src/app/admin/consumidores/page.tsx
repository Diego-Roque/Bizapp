import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { dayKey } from "@/lib/day";
import { CompaniesManager } from "./companies-manager";

export const metadata = { title: "Compañías" };

async function CompaniesContent() {
  await requireAdmin();
  const today = dayKey();

  const companies = await db.company.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      employees: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          _count: { select: { orders: { where: { dayKey: today, status: { not: "CANCELLED" } } } } },
        },
      },
    },
  });

  return (
    <CompaniesManager
      companies={companies.map((c) => ({
        id: c.id,
        name: c.name,
        employees: c.employees.map((e) => ({ id: e.id, name: e.name, today: e._count.orders })),
      }))}
    />
  );
}

export default function CompaniesPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <CompaniesContent />
    </Suspense>
  );
}
