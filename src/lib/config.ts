export const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/Mexico_City";
export const DAILY_DRINK_LIMIT = Math.max(1, Number(process.env.DAILY_DRINK_LIMIT) || 2);
export const ALLOWED_EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || "").trim().toLowerCase();

export const DRINK_CATEGORIES = [
  "Café",
  "Café frío",
  "Té",
  "Refresher",
  "Refresco",
  "Agua",
  "Jugo",
  "Cerveza",
  "Vino",
  "Coctel",
  "Destilado",
  "Mocktail",
] as const;

export const UNITS = ["ml", "g", "oz", "pieza", "l", "kg", "botella", "lata"] as const;
