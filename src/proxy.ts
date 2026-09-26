import { NextResponse, type NextRequest } from "next/server";
import { classifyAdminPath } from "@/lib/admin-route";
import { isPublicPath } from "@/lib/public-routes";
import {
  hasAdminTokenCookie,
  hasStudentTokenCookie,
} from "@/lib/session-token";

const AUTH_ROUTES = ["/login", "/register"];

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Optimistic cookie gate only. Security is not decided here: server layouts
 * re-check with the backend session endpoint (a decoded-and-equally-replaceable
 * cookie is not authorization), and every gated API call now crosses to the
 * backend with a Bearer token the backend itself verifies.
 */
export default async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const adminPath = classifyAdminPath(pathname);
  if (adminPath) {
    // Always let /admin/login through, as with /login: a present cookie may
    // hold an expired token, and bouncing it to /admin — which sends a rejected
    // session back here — loops forever. The (entry) layout does the
    // authoritative "already signed in" check.
    if (adminPath === "auth" || adminPath === "login") return NextResponse.next();

    if (hasAdminTokenCookie(req)) return NextResponse.next();

    if (pathname.startsWith("/admin/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminLogin = new URL("/admin/login", req.url);
    adminLogin.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(adminLogin);
  }

  const token = hasStudentTokenCookie(req);

  // Signed-in users belong in the app, not on the marketing page.
  if (pathname === "/" && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Always let /login and /register through — a token that merely decodes is
  // not a session. The (auth) layout does the authoritative session check.
  if (isAuthRoute(pathname)) return NextResponse.next();

  if (token) return NextResponse.next();

  // The public surface: marketing page, the indexable /learn and
  // /past-questions trees, and the crawler-facing metadata files.
  if (isPublicPath(pathname)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = new URL("/login", req.url);
  login.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    // There are no more browser-reachable student/auth or billing routes on
    // this origin — everything /api and /admin/api crosses to the FastAPI
    // backend — so the old exclusions are gone. Static assets and the worker
    // stay out of the gate.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};