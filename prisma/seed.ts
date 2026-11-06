import "dotenv/config";
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const ca = process.env.DATABASE_CA_CERT?.trim();
const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  ssl: ca ? { ca: ca.includes("BEGIN CERTIFICATE") ? ca : readFileSync(ca, "utf8") } : undefined,
});
const db = new PrismaClient({ adapter });

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: process.env.APP_TIMEZONE || "America/Mexico_City",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

async function main() {
  const email = (process.env.ADMIN_EMAIL || "barman@empresa.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "cambia-esta-contrasena";
  const admin = await db.user.upsert({
    where: { email },
    update: { active: true },
    create: {
      email,
      name: process.env.ADMIN_NAME || "Barman",
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  console.log(`Admin listo: ${admin.email}`);

  if ((await db.drink.count()) > 0) {
    console.log("El menú ya tiene bebidas, no se cargan ejemplos.");
    return;
  }

  // Menú e inventario de ejemplo para arrancar. Edítalos desde /admin.
  const items = {
    cafe: { name: "Café en grano", unit: "g", stock: 2000, minStock: 400, unitCost: 0.45 },
    leche: { name: "Leche entera", unit: "ml", stock: 8000, minStock: 2000, unitCost: 0.026 },
    agua: { name: "Agua mineral 355 ml", unit: "botella", stock: 48, minStock: 12, unitCost: 14 },
    refresco: { name: "Refresco de cola lata", unit: "lata", stock: 36, minStock: 12, unitCost: 15.5 },
    cerveza: { name: "Cerveza clara 355 ml", unit: "botella", stock: 24, minStock: 12, unitCost: 22 },
    limon: { name: "Limón", unit: "pieza", stock: 60, minStock: 15, unitCost: 2.2 },
    te: { name: "Té verde en sobre", unit: "pieza", stock: 50, minStock: 10, unitCost: 3.1 },
  } as const;

  const ids: Record<string, string> = {};
  for (const [k, v] of Object.entries(items)) {
    const it = await db.inventoryItem.create({
      data: {
        ...v,
        movements: {
          create: { type: "PURCHASE", quantity: v.stock, unitCost: v.unitCost, dayKey: today, userId: admin.id, note: "Stock inicial" },
        },
      },
    });
    ids[k] = it.id;
  }

  const drinks = [
    { name: "Espresso", category: "Café", description: "Doble, recién molido", recipe: [["cafe", 18]] },
    { name: "Latte", category: "Café", description: "Espresso con leche vaporizada", recipe: [["cafe", 18], ["leche", 220]] },
    { name: "Té verde", category: "Té", description: "Caliente o frío", recipe: [["te", 1]] },
    { name: "Agua mineral", category: "Agua", description: null, recipe: [["agua", 1], ["limon", 1]] },
    { name: "Refresco de cola", category: "Refresco", description: "Con hielo y limón", recipe: [["refresco", 1], ["limon", 1]] },
    { name: "Cerveza clara", category: "Cerveza", description: "Solo viernes después de las 5", recipe: [["cerveza", 1]] },
  ] as const;

  for (const [i, d] of drinks.entries()) {
    await db.drink.create({
      data: {
        name: d.name,
        category: d.category,
        description: d.description,
        sortOrder: i,
        recipe: { create: d.recipe.map(([k, q]) => ({ inventoryItemId: ids[k], quantity: q })) },
      },
    });
  }
  console.log(`Menú de ejemplo: ${drinks.length} bebidas, ${Object.keys(items).length} ingredientes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
