import "server-only";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Falta DATABASE_URL en .env");

/**
 * TLS verificado: Supabase firma con su propia CA. Descárgala en
 * Project Settings > Database > SSL Configuration y apunta DATABASE_CA_CERT
 * a la ruta del .crt (o pega el PEM directo en la variable).
 */
function sslConfig() {
  const ca = process.env.DATABASE_CA_CERT?.trim();
  if (!ca) return undefined;
  return { ca: ca.includes("BEGIN CERTIFICATE") ? ca : readFileSync(ca, "utf8") };
}

function createClient() {
  const adapter = new PrismaPg({ connectionString, ssl: sslConfig(), max: 5 });
  return new PrismaClient({ adapter });
}

// Reutiliza el cliente entre recargas de `next dev` para no agotar conexiones
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
