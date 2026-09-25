/**
 * Cookie helpers shared by the proxy and the signed-out route.
 *
 * The frontend keeps Bearer access tokens in plain, JS-readable cookies
 * (`sc.access_token` for students, `sc.admin_access_token` for admins). The
 * proxy only checks *presence* — it cannot decode the JWT, and it is not the
 * security boundary. The layouts re-check with the backend's session
 * endpoint, and every gated API call carries the token that the backend
 * verifies.
 *
 * Deliberately free of framework and database imports — the proxy runs this
 * on every request.
 */
import type { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, ADMIN_ACCESS_COOKIE } from "@/lib/api/config";

export function hasStudentTokenCookie(req: NextRequest): boolean {
  return Boolean(req.cookies.get(ACCESS_COOKIE)?.value);
}

export function hasAdminTokenCookie(req: NextRequest): boolean {
  return Boolean(req.cookies.get(ADMIN_ACCESS_COOKIE)?.value);
}

/**
 * Clears the new access-token cookies and any leftover Auth.js cookies from
 * the pre-backend deployment (`authjs.session-token` and its `.N` chunks, in
 * either secure or insecure form), so a stale Auth.js cookie can never be
 * mistaken for a live session.
 */
export function deleteSessionCookies(req: NextRequest, res: NextResponse): void {
  // The access-token cookies.
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(ADMIN_ACCESS_COOKIE);

  // Legacy Auth.js session cookies (both the `__Secure-` and plain names —
  // the chunk list covers whichever the deployment used).
  const legacyNames = new Set<string>();
  for (const cookie of req.cookies.getAll()) {
    if (
      cookie.name.startsWith("authjs.session-token") ||
      cookie.name.startsWith("__Secure-authjs.session-token")
    ) {
      legacyNames.add(cookie.name);
    }
  }
  for (const name of legacyNames) {
    res.cookies.delete({ name, path: "/" });
    res.cookies.delete({ name, path: "/", secure: true });
  }
}