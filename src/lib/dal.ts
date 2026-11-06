import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "./db";
import { readSession } from "./session";

/** Barman actual, verificado contra la base (no solo la cookie) */
export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, active: true },
  });
  if (!user || !user.active) return null;
  return user;
});

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
