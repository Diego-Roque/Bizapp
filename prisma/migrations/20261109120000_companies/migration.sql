-- Compañías y empleados como registros: el kiosco ya no acepta texto libre.
-- Convierte las compañías que se escribieron a mano en filas de "Company" sin perder historial.

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Company_key_key" ON "Company"("key");

ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;

-- El "key" viejo de Customer es "compañía|nombre" ya normalizado
INSERT INTO "Company" ("id", "name", "key", "createdAt")
SELECT gen_random_uuid()::text, c."company", c."ck", c."createdAt"
FROM (
    SELECT DISTINCT ON (split_part("key", '|', 1))
        split_part("key", '|', 1) AS "ck", "company", "createdAt"
    FROM "Customer"
    ORDER BY split_part("key", '|', 1), "createdAt" ASC
) c;

-- Customer: companyId + nameKey en lugar de company + key
ALTER TABLE "Customer" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "nameKey" TEXT;
ALTER TABLE "Customer" ADD COLUMN "deletedAt" TIMESTAMP(3);

UPDATE "Customer" cu
SET "companyId" = co."id", "nameKey" = split_part(cu."key", '|', 2)
FROM "Company" co
WHERE co."key" = split_part(cu."key", '|', 1);

ALTER TABLE "Customer" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "nameKey" SET NOT NULL;

DROP INDEX "Customer_key_key";
DROP INDEX "Customer_company_idx";
ALTER TABLE "Customer" DROP COLUMN "key";
ALTER TABLE "Customer" DROP COLUMN "company";

CREATE UNIQUE INDEX "Customer_companyId_nameKey_key" ON "Customer"("companyId", "nameKey");

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
