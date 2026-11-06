"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { DAILY_DRINK_LIMIT } from "@/lib/config";
import { customerKey, tidy } from "@/lib/customer";
import { dayKey } from "@/lib/day";
import { num } from "@/lib/format";
import type { OrderStatus } from "@/generated/prisma/enums";
import type { ActionState } from "./types";

class UserFacingError extends Error {}

const who = z.object({
  company: z.string().transform(tidy).pipe(z.string().min(2, "Escribe tu compañía").max(60)),
  name: z.string().transform(tidy).pipe(z.string().min(2, "Escribe tu nombre").max(60)),
});

/** Cuántas bebidas le quedan hoy a esta persona (kiosco, sin login) */
export async function checkAllowance(input: { company: string; name: string }) {
  const parsed = who.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors, remaining: 0, limit: DAILY_DRINK_LIMIT };
  }
  const key = customerKey(parsed.data.company, parsed.data.name);
  const used = await db.order.count({
    where: { customer: { key }, dayKey: dayKey(), status: { not: "CANCELLED" } },
  });
  return { remaining: Math.max(0, DAILY_DRINK_LIMIT - used), limit: DAILY_DRINK_LIMIT };
}

const placeSchema = who.extend({
  drinkId: z.string().min(1),
  notes: z.string().trim().max(200).optional(),
});

export type PlaceResult = ActionState & { orderId?: string; remaining?: number };

export async function placeOrder(input: z.input<typeof placeSchema>): Promise<PlaceResult> {
  const parsed = placeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Pedido inválido" };
  const { company, name, drinkId, notes } = parsed.data;
  const key = customerKey(company, name);
  const today = dayKey();

  try {
    const { orderId, used } = await db.$transaction(async (tx) => {
      // Serializa los pedidos de esta persona en este día: dos toques rápidos no saltan el límite
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${key}:${today}`}))`;

      const customer = await tx.customer.upsert({
        where: { key },
        // Conserva cómo se escribió la primera vez (con acentos y mayúsculas)
        update: { lastSeenAt: new Date() },
        create: { key, company, name },
      });

      const used = await tx.order.count({
        where: { customerId: customer.id, dayKey: today, status: { not: "CANCELLED" } },
      });
      if (used >= DAILY_DRINK_LIMIT) {
        throw new UserFacingError(`Ya pediste tus ${DAILY_DRINK_LIMIT} bebidas de hoy. Mañana hay más.`);
      }

      const drink = await tx.drink.findFirst({
        where: { id: drinkId, deletedAt: null },
        include: { recipe: { include: { inventoryItem: true } } },
      });
      if (!drink || drink.status !== "AVAILABLE") throw new UserFacingError("Esta bebida ya no está disponible");
      if (drink.recipe.some((r) => num(r.inventoryItem.stock) < num(r.quantity))) {
        throw new UserFacingError("Se acabaron los ingredientes para esta bebida");
      }

      const order = await tx.order.create({
        data: { customerId: customer.id, drinkId: drink.id, dayKey: today, notes: notes || null },
      });
      return { orderId: order.id, used: used + 1 };
    });

    revalidatePath("/admin");
    return { ok: true, orderId, remaining: DAILY_DRINK_LIMIT - used };
  } catch (e) {
    if (e instanceof UserFacingError) return { error: e.message };
    throw e;
  }
}

/** "Deshacer" en la pantalla de confirmación del kiosco: solo mientras la barra no lo toma */
export async function undoOrder(orderId: string): Promise<ActionState> {
  const res = await db.order.updateMany({
    where: { id: orderId, status: "PENDING", createdAt: { gte: new Date(Date.now() - 2 * 60_000) } },
    data: { status: "CANCELLED" },
  });
  if (res.count === 0) return { error: "Ya no se puede deshacer: la barra lo está preparando" };
  revalidatePath("/admin");
  return { ok: true, message: "Pedido cancelado" };
}

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PREPARING", "READY", "DELIVERED", "CANCELLED"],
  PREPARING: ["READY", "DELIVERED", "CANCELLED"],
  READY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export async function setOrderStatus(orderId: string, status: OrderStatus): Promise<ActionState> {
  const admin = await requireAdmin();

  try {
    await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { drink: { include: { recipe: { include: { inventoryItem: true } } } } },
      });
      if (!order) throw new UserFacingError("El pedido no existe");
      if (!NEXT[order.status].includes(status)) throw new UserFacingError("Ese cambio de estado no es válido");

      const moved = await tx.order.updateMany({
        where: { id: orderId, status: order.status }, // evita doble entrega desde dos pantallas
        data: { status, deliveredAt: status === "DELIVERED" ? new Date() : undefined },
      });
      if (moved.count === 0) throw new UserFacingError("Este pedido ya se actualizó en otra pantalla");

      // Al entregar, se descuentan los ingredientes de la receta
      if (status === "DELIVERED") {
        const today = dayKey();
        for (const r of order.drink.recipe) {
          await tx.inventoryItem.update({
            where: { id: r.inventoryItemId },
            data: { stock: { decrement: r.quantity } },
          });
          await tx.inventoryMovement.create({
            data: {
              itemId: r.inventoryItemId,
              type: "CONSUMPTION",
              quantity: r.quantity.negated(),
              unitCost: r.inventoryItem.unitCost,
              dayKey: today,
              orderId: order.id,
              userId: admin.id,
              note: order.drink.name,
            },
          });
        }
      }
    });
  } catch (e) {
    if (e instanceof UserFacingError) return { error: e.message };
    throw e;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/inventario");
  revalidatePath("/");
  return { ok: true };
}
