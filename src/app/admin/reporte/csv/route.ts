import { getCurrentUser } from "@/lib/dal";
import { isMonthKey, monthKey, monthLabel } from "@/lib/day";
import { getMonthlyReport } from "@/lib/report";

function csvCell(v: string | number) {
  const s = typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(3)) : v;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("No autorizado", { status: 403 });

  const mes = new URL(request.url).searchParams.get("mes");
  const month = isMonthKey(mes) ? mes : monthKey();
  const r = await getMonthlyReport(month);

  const rows: (string | number)[][] = [
    [`Reporte BizBar`, monthLabel(month)],
    [],
    ["Resumen"],
    ["Bebidas entregadas", r.totals.delivered],
    ["Pedidos cancelados", r.totals.cancelled],
    ["Personas atendidas", r.totals.people],
    ["Costo de lo servido", r.totals.consumptionCost.toFixed(2)],
    ["Compras del mes", r.totals.purchaseCost.toFixed(2)],
    [],
    ["Por compañía"],
    ["Compañía", "Personas", "Entregadas"],
    ...r.companies.map((c) => [c.company, c.people, c.delivered]),
    [],
    ["Bebidas por tipo"],
    ["Bebida", "Categoría", "Entregadas"],
    ...r.drinks.map((d) => [d.name, d.category, d.delivered]),
    [],
    ["Ingredientes"],
    ["Ingrediente", "Unidad", "Inicial", "Entradas", "Costo entradas", "Consumo", "Costo consumo", "Merma", "Ajuste", "Final"],
    ...r.inventory.map((i) => [
      i.name,
      i.unit,
      i.opening,
      i.purchases,
      i.purchaseCost.toFixed(2),
      i.consumption,
      i.consumptionCost.toFixed(2),
      i.waste,
      i.adjustments,
      i.closing,
    ]),
    [],
    ["Entregas por día"],
    ["Fecha", "Entregadas"],
    ...r.daily.map((d) => [d.key, d.count]),
  ];

  // BOM para que Excel abra bien los acentos
  const body = "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bizbar-reporte-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
