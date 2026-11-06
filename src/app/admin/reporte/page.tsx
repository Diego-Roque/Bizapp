import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons";
import Link from "next/link";
import { CaretLeftIcon, CaretRightIcon, DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { requireAdmin } from "@/lib/dal";
import { isMonthKey, monthKey, monthLabel, shiftMonth } from "@/lib/day";
import { fmtMoney, fmtQty } from "@/lib/format";
import { getMonthlyReport } from "@/lib/report";
import { Card, EmptyState, PageHeader, buttonClass, cn } from "@/components/ui";
import { DailyChart } from "./daily-chart";
import { PrintButton } from "./print-button";

export const metadata = { title: "Reporte mensual" };

async function ReportPageContent({ searchParams }: PageProps<"/admin/reporte">) {
  await requireAdmin();
  const sp = await searchParams;
  const raw = typeof sp.mes === "string" ? sp.mes : undefined;
  const current = monthKey();
  const month = isMonthKey(raw) && raw <= current ? raw : current;
  const r = await getMonthlyReport(month);
  const isCurrent = month === current;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Reporte mensual"
        subtitle={isCurrent ? `${monthLabel(month)}, en curso` : monthLabel(month)}
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-full bg-surface p-1 shadow-card">
              <Link
                href={`/admin/reporte?mes=${shiftMonth(month, -1)}`}
                aria-label="Mes anterior"
                className={buttonClass("ghost", "sm", "w-8 px-0")}
              >
                <CaretLeftIcon className="size-4" weight="bold" />
              </Link>
              <span className="min-w-[8.5rem] text-center text-[14px] font-medium text-ink">{monthLabel(month)}</span>
              {isCurrent ? (
                <span className={buttonClass("ghost", "sm", "w-8 px-0 opacity-30")} aria-hidden>
                  <CaretRightIcon className="size-4" weight="bold" />
                </span>
              ) : (
                <Link
                  href={`/admin/reporte?mes=${shiftMonth(month, 1)}`}
                  aria-label="Mes siguiente"
                  className={buttonClass("ghost", "sm", "w-8 px-0")}
                >
                  <CaretRightIcon className="size-4" weight="bold" />
                </Link>
              )}
            </div>
            <a href={`/admin/reporte/csv?mes=${month}`} className={buttonClass("secondary", "md")}>
              <DownloadSimpleIcon className="size-4" weight="bold" />
              CSV
            </a>
            <PrintButton />
          </div>
        }
      />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Bebidas entregadas" value={String(r.totals.delivered)} />
        <Stat label="Personas atendidas" value={String(r.totals.people)} />
        <Stat label="Costo de lo servido" value={fmtMoney(r.totals.consumptionCost)} />
        <Stat label="Compras del mes" value={fmtMoney(r.totals.purchaseCost)} />
      </dl>

      <Card className="print-flat p-5">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-[15px] font-semibold text-ink">Bebidas entregadas por día</h2>
          {r.totals.cancelled > 0 && (
            <p className="text-[13px] text-ink-2">
              {r.totals.cancelled} {r.totals.cancelled === 1 ? "pedido cancelado" : "pedidos cancelados"}
            </p>
          )}
        </div>
        <DailyChart data={r.daily} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="by-company" className="flex flex-col gap-3">
          <h2 id="by-company" className="t-title text-ink">
            Por compañía
          </h2>
          {r.companies.length === 0 ? (
            <EmptyState icon={<span className="font-mono text-ink-2">0</span>} title="Sin entregas" body="No hubo bebidas entregadas en este mes." />
          ) : (
            <Card className="print-flat overflow-hidden">
              <table className="w-full text-left text-[14px]">
                <thead className="text-[12px] text-ink-2">
                  <tr>
                    <th className="px-4 py-3 font-medium">Compañía</th>
                    <th className="px-4 py-3 text-right font-medium">Personas</th>
                    <th className="px-4 py-3 text-right font-medium">Entregadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {r.companies.map((c) => (
                    <tr key={c.company}>
                      <td className="px-4 py-2.5 text-ink">{c.company}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-ink-2">{c.people}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-ink">{c.delivered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>

        <section aria-labelledby="by-drink" className="flex flex-col gap-3">
          <h2 id="by-drink" className="t-title text-ink">
            Por bebida
          </h2>
          {r.drinks.length === 0 ? (
            <EmptyState icon={<span className="font-mono text-ink-2">0</span>} title="Sin entregas" body="No hubo bebidas entregadas en este mes." />
          ) : (
            <Card className="print-flat overflow-hidden">
              <table className="w-full text-left text-[14px]">
                <thead className="text-[12px] text-ink-2">
                  <tr>
                    <th className="px-4 py-3 font-medium">Bebida</th>
                    <th className="px-4 py-3 text-right font-medium">Entregadas</th>
                    <th className="px-4 py-3 text-right font-medium">Del total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {r.drinks.map((d) => (
                    <tr key={d.name}>
                      <td className="px-4 py-2.5">
                        <span className="text-ink">{d.name}</span>
                        <span className="ml-2 text-[12px] text-ink-2">{d.category}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-ink">{d.delivered}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-ink-2">
                        {Math.round((d.delivered / r.totals.delivered) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>

      </div>

        <section aria-labelledby="by-item" className="flex flex-col gap-3">
          <h2 id="by-item" className="t-title text-ink">
            Ingredientes del mes
          </h2>
          {r.inventory.length === 0 ? (
            <EmptyState icon={<span className="font-mono text-ink-2">0</span>} title="Sin ingredientes" body="Da de alta ingredientes para ver su conciliación mensual." />
          ) : (
            <Card className="print-flat overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-[14px]">
                  <thead className="text-[12px] text-ink-2">
                    <tr>
                      <th className="px-4 py-3 font-medium">Ingrediente</th>
                      <th className="px-3 py-3 text-right font-medium">Inicial</th>
                      <th className="px-3 py-3 text-right font-medium">Entradas</th>
                      <th className="px-3 py-3 text-right font-medium">Consumo</th>
                      <th className="px-3 py-3 text-right font-medium">Merma</th>
                      <th className="px-3 py-3 text-right font-medium">Ajuste</th>
                      <th className="px-4 py-3 text-right font-medium">Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-mono tabular-nums">
                    {r.inventory.map((i) => (
                      <tr key={i.id}>
                        <td className="px-4 py-2.5 font-sans">
                          <span className="text-ink">{i.name}</span>
                          <span className="ml-1.5 text-[12px] text-ink-2">{i.unit}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-ink-2">{fmtQty(i.opening)}</td>
                        <td className="px-3 py-2.5 text-right text-ink">{i.purchases ? `+${fmtQty(i.purchases)}` : "0"}</td>
                        <td className="px-3 py-2.5 text-right text-ink">{i.consumption ? `-${fmtQty(i.consumption)}` : "0"}</td>
                        <td className="px-3 py-2.5 text-right text-ink">{i.waste ? `-${fmtQty(i.waste)}` : "0"}</td>
                        <td className="px-3 py-2.5 text-right text-ink-2">
                          {i.adjustments > 0 ? "+" : ""}
                          {fmtQty(i.adjustments)}
                        </td>
                        <td className={cn("px-4 py-2.5 text-right font-medium", i.closing < 0 ? "text-danger" : "text-ink")}>
                          {fmtQty(i.closing)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          <p className="text-[13px] text-ink-2">Final = Inicial + Entradas - Consumo - Merma ± Ajuste.</p>
        </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-flat rounded-[20px] bg-surface px-5 py-4 shadow-card">
      <dt className="text-[13px] text-ink-2">{label}</dt>
      <dd className="mt-1 font-mono text-[26px] font-medium tracking-[-0.02em] text-ink tabular-nums">{value}</dd>
    </div>
  );
}

export default function ReportPage(props: PageProps<"/admin/reporte">) {
  return (
    <Suspense fallback={<PageSkeleton variant="report" />}>
      <ReportPageContent {...props} />
    </Suspense>
  );
}
