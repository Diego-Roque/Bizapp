import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/token";

// El kiosco (/) es público. Solo /admin pide sesión.
// Chequeo optimista (solo cookie); la autorización real vive en src/lib/dal.ts.
// /login nunca redirige: una cookie de una cuenta desactivada o borrada causaría un ciclo.
export async function proxy(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.redirect(new URL("/login", req.nextUrl));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
