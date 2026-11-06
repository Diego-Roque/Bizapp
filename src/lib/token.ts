import { SignJWT, jwtVerify } from "jose";

// Compartido por proxy.ts y session.ts. Solo el personal de barra tiene sesión.
export type SessionPayload = { userId: string };
export const SESSION_COOKIE = "bizbar_session";

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET falta o es muy corto");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload, maxAgeSeconds: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
