-- La app accede con Prisma (rol postgres, que no pasa por RLS).
-- Activar RLS sin políticas cierra estas tablas a la API REST de Supabase (roles anon/authenticated).
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Drink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecipeItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
