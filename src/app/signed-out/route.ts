import { NextResponse, type NextRequest } from "next/server";
import { deleteSessionCookies } from "@/lib/session-token";

export const dynamic = "force-dynamic";

/**
 * Clears the caller's own session cookies after a device-limited or remote
 * sign-out, then points at the login page. Public, and it only ever clears the
 * caller's own cookies.
 */
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login?reason=device", req.url));
  deleteSessionCookies(req, res);
  return res;
}