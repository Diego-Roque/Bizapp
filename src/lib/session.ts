import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, signSession, verifySession, type SessionPayload } from "./token";

const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

export async function createSession(payload: SessionPayload) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(payload, MAX_AGE), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function readSession() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}
