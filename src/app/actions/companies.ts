"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { nameKey, tidy } from "@/lib/customer";
import type { ActionState } from "./types";

const name = (msg: string) => z.string().transform(tidy).pipe(z.string().min(2, msg).max(60, "Máximo 60 caracteres"));

function revalidate() {
  revalidatePath("/admin/consumidores");
  revalidatePath("/admin/usuarios");
  revalidatePath("/");
}

function fieldErrors(error: z.ZodError): ActionState {
  const fe: Record<string, string> = {};
  for (const i of error.issues) fe[String(i.path[0])] ??= i.message;
  return { fieldErrors: fe };
}

/* ---------- Compañías ---------- */

const companySchema = z.object({ id: z.string().optional(), name: name("Escribe el nombre de la compañía") });

export async function saveCompany(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = companySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { id, name } = parsed.data;
  const key = nameKey(name);

  const clash = await db.company.findUnique({ where: { key } });
  if (clash && clash.id !== id) {
    if (!clash.deletedAt) return { fieldErrors: { name: "Ya existe una compañía con ese nombre" } };
    if (!id) {
      // Se había eliminado: se recupera con sus empleados e historial
      await db.$transaction([
        db.company.update({ where: { id: clash.id }, data: { name, deletedAt: null } }),
        // Solo los que se fueron junto con la compañía (misma marca de tiempo), no los que ya se habían dado de baja
        db.customer.updateMany({ where: { companyId: clash.id, deletedAt: clash.deletedAt }, data: { deletedAt: null } }),
      ]);
      revalidate();
      return { ok: true, message: "Compañía recuperada con sus empleados" };
    }
    // Renombrar sobre una eliminada: la eliminada libera el nombre
    await db.company.update({ where: { id: clash.id }, data: { key: `${key}~${clash.id}` } });
  }

  if (id) await db.company.update({ where: { id }, data: { name, key } });
  else await db.company.create({ data: { name, key } });
  revalidate();
  return { ok: true, message: id ? "Compañía actualizada" : "Compañía creada" };
}

export async function deleteCompany(companyId: string): Promise<ActionState> {
  await requireAdmin();
  const orders = await db.order.count({ where: { customer: { companyId } } });
  if (orders > 0) {
    // Tiene historial: desaparece del kiosco pero los reportes la siguen contando
    const now = new Date();
    await db.$transaction([
      db.company.update({ where: { id: companyId }, data: { deletedAt: now } }),
      db.customer.updateMany({ where: { companyId, deletedAt: null }, data: { deletedAt: now } }),
    ]);
  } else {
    await db.company.delete({ where: { id: companyId } });
  }
  revalidate();
  return { ok: true, message: "Compañía eliminada" };
}

/* ---------- Empleados ---------- */

const addSchema = z.object({
  companyId: z.string().min(1, "Elige una compañía"),
  // Uno por renglón: así se da de alta a un equipo completo de una vez
  names: z
    .string()
    .transform((s) => s.split(/\r?\n/).map(tidy).filter(Boolean))
    .pipe(z.array(z.string().min(2, "Cada nombre necesita al menos 2 letras").max(60, "Máximo 60 caracteres por nombre")).min(1, "Escribe al menos un nombre")),
});

export async function addEmployees(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { companyId } = parsed.data;

  const company = await db.company.findFirst({ where: { id: companyId, deletedAt: null } });
  if (!company) return { fieldErrors: { companyId: "Esa compañía ya no existe" } };

  const byKey = new Map(parsed.data.names.map((n) => [nameKey(n), n]));
  const existing = await db.customer.findMany({ where: { companyId, nameKey: { in: [...byKey.keys()] } } });
  const found = new Map(existing.map((c) => [c.nameKey, c]));

  let added = 0;
  let skipped = 0;
  await db.$transaction(async (tx) => {
    for (const [key, n] of byKey) {
      const prev = found.get(key);
      if (prev && !prev.deletedAt) skipped++;
      else if (prev) {
        await tx.customer.update({ where: { id: prev.id }, data: { name: n, deletedAt: null } });
        added++;
      } else {
        await tx.customer.create({ data: { companyId, name: n, nameKey: key } });
        added++;
      }
    }
  });

  revalidate();
  if (added === 0) return { fieldErrors: { names: skipped === 1 ? "Esa persona ya está en la lista" : "Esas personas ya están en la lista" } };
  const msg = added === 1 ? "Empleado agregado" : `${added} empleados agregados`;
  return { ok: true, message: skipped ? `${msg} (${skipped} ya estaba${skipped === 1 ? "" : "n"})` : msg };
}

const editSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1, "Elige una compañía"),
  name: name("Escribe el nombre"),
});

export async function updateEmployee(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = editSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { id, companyId, name } = parsed.data;
  const key = nameKey(name);

  const company = await db.company.findFirst({ where: { id: companyId, deletedAt: null } });
  if (!company) return { fieldErrors: { companyId: "Esa compañía ya no existe" } };

  const clash = await db.customer.findUnique({ where: { companyId_nameKey: { companyId, nameKey: key } } });
  if (clash && clash.id !== id) {
    if (!clash.deletedAt) return { fieldErrors: { name: `Ya hay alguien con ese nombre en ${company.name}` } };
    await db.customer.update({ where: { id: clash.id }, data: { nameKey: `${key}~${clash.id}` } });
  }

  await db.customer.update({ where: { id }, data: { name, nameKey: key, companyId } });
  revalidate();
  return { ok: true, message: "Empleado actualizado" };
}

export async function deleteEmployee(customerId: string): Promise<ActionState> {
  await requireAdmin();
  const orders = await db.order.count({ where: { customerId } });
  if (orders > 0) await db.customer.update({ where: { id: customerId }, data: { deletedAt: new Date() } });
  else await db.customer.delete({ where: { id: customerId } });
  revalidate();
  return { ok: true, message: "Empleado eliminado" };
}
