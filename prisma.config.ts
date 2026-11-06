import "dotenv/config";
import { defineConfig } from "prisma/config";

// La CLI (migrate, db push, studio) usa la conexión directa de Supabase (puerto 5432).
// La app en runtime usa DATABASE_URL (pooler, puerto 6543) desde src/lib/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
