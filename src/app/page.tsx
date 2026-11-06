import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { BrandMark } from "@/components/app-header";
import { Poller } from "@/components/poller";
import { Bone } from "@/components/skeletons";
import { db } from "@/lib/db";
import { DAILY_DRINK_LIMIT } from "@/lib/config";
import { dayKey, todayLabel } from "@/lib/day";
import { getMenu } from "@/lib/menu";
import { Kiosk } from "./_kiosk/kiosk";

export const metadata = { title: "Pide tu bebida · BizBar" };

async function KioskContent() {
  await connection(); // siempre en vivo: el menú y "listos para recoger" cambian a cada rato
  const today = dayKey();
  const [menu, companies, ready] = await Promise.all([
    getMenu(),
    db.customer.findMany({
      distinct: ["company"],
      orderBy: { lastSeenAt: "desc" },
      take: 60,
      select: { company: true },
    }),
    db.order.findMany({
      where: { dayKey: today, status: "READY" },
      orderBy: { updatedAt: "asc" },
      select: { id: true, customer: { select: { name: true } }, drink: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <Poller seconds={10} />
      <Kiosk
        today={todayLabel()}
        limit={DAILY_DRINK_LIMIT}
        drinks={menu}
        companies={companies.map((c) => c.company)}
        ready={ready.map((o) => ({ id: o.id, name: o.customer.name, drink: o.drink.name }))}
      />
    </>
  );
}

export default function KioskPage() {
  return (
    <div className="ambient flex min-h-[100dvh] flex-col">
      <header className="glass sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-4 md:px-8">
          <BrandMark />
          <Link
            href="/admin"
            className="pressable flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <LockSimpleIcon className="size-4" />
            Barra
          </Link>
        </div>
      </header>
      <Suspense
        fallback={
          <div
            className="mx-auto grid w-full max-w-[1240px] gap-8 px-4 pt-8 md:px-8 md:pt-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10"
            aria-busy="true"
            aria-label="Cargando"
          >
            <div>
              <Bone className="h-4 w-40" />
              <Bone className="mt-3 h-11 w-80" />
              <Bone className="mt-8 h-10 w-96 rounded-full" />
              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }, (_, i) => (
                  <Bone key={i} className="aspect-square rounded-[24px]" />
                ))}
              </div>
            </div>
            <Bone className="hidden h-[520px] rounded-[28px] lg:block" />
          </div>
        }
      >
        <KioskContent />
      </Suspense>
    </div>
  );
}
