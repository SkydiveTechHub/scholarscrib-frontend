

export const API_URL = (
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://scholarscrib-backend.onrender.com"
    : "http://localhost:8000")
).replace(/\/+$/, "");

/** Cookie carrying the student access token. JS-readable, path=/ */
export const ACCESS_COOKIE = "sc.access_token";

/** Cookie carrying the admin access token. JS-readable, path=/ */
export const ADMIN_ACCESS_COOKIE = "sc.admin_access_token";

/**
 * Cookie carrying the tutor (center) access token.
 * Must match BE `app/api/center/cookies.py`: name `scholarscrib.tutor-session`,
 * path `/center`. FE keeps it JS-readable so the browser can attach
 * `Authorization: Bearer` (same pattern as student/admin cookies).
 */
export const TUTOR_ACCESS_COOKIE = "scholarscrib.tutor-session";

/** Path scope for the tutor session cookie — must match BE `path="/center"`. */
export const TUTOR_ACCESS_COOKIE_PATH = "/center";

/** Pre-M1 FE name; cleared on logout/sign-out so stale cookies cannot linger. */
export const LEGACY_TUTOR_ACCESS_COOKIE = "sc.tutor_access_token";

/** Cookie carrying the access token, chosen by identity realm. */
export function accessCookieFor(path: string): string {
  if (path.startsWith("/admin")) return ADMIN_ACCESS_COOKIE;
  if (path.startsWith("/center")) return TUTOR_ACCESS_COOKIE;
  return ACCESS_COOKIE;
}

