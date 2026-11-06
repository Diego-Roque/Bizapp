type DecimalLike = { toNumber(): number } | number | string | null | undefined;

export function num(v: DecimalLike): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return v.toNumber();
}

const qty = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 });
const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export const fmtQty = (n: number) => qty.format(n);
export const fmtMoney = (n: number) => money.format(n);
