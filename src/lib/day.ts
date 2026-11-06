import { APP_TIMEZONE } from "./config";

/** YYYY-MM-DD de la fecha en la zona horaria de la oficina */
export function dayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** YYYY-MM actual */
export function monthKey(date: Date = new Date()): string {
  return dayKey(date).slice(0, 7);
}

export function isMonthKey(v: string | undefined | null): v is string {
  return !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

/** Primer día del mes y primer día del mes siguiente (como dayKeys, comparables como string) */
export function monthBounds(month: string): { start: string; end: string } {
  return { start: `${month}-01`, end: `${shiftMonth(month, 1)}-01` };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 15)),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function timeLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE }).format(date);
}

export function dateLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  }).format(date);
}

export function todayLabel(): string {
  const s = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: APP_TIMEZONE,
  }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
}
