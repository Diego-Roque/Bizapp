"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import type { ActionState } from "./types";

const staffSchema = z.object({
  name: z.string().trim().min(2, "Escribe un nombre").max(80),
  email: z.string().trim().toLowerCase().email("Escribe un correo válido"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(128),
});

export async function createStaff(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = staffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors };
  }
  const { name, email, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) {
    return { fieldErrors: { email: "Ya existe una cuenta con este correo" } };
  }
  await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
  revalidatePath("/admin/usuarios");
  return { ok: true, message: "Cuenta de barra creada" };
}

export async function setStaffActive(userId: string, active: boolean): Promise<ActionState> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { error: "No puedes desactivar tu propia cuenta" };
  await db.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/admin/usuarios");
  return { ok: true, message: active ? "Cuenta activada" : "Cuenta desactivada" };
}
