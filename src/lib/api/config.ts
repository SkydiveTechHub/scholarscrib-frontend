

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

/** Cookie carrying the access token, chosen by identity realm. */
export function accessCookieFor(path: string): string {
  return path.startsWith("/admin") ? ADMIN_ACCESS_COOKIE : ACCESS_COOKIE;
}

