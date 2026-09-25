/**
 * Endpoint and cookie configuration for the ScholarsCrib FastAPI backend.
 *
 * The backend lives on a separate origin. Server components and route handlers
 * call it through `API_URL` (server-only), while the browser calls it through
 * `NEXT_PUBLIC_API_URL`. Both fall back to a sensible default so a local
 * backend at :8000 just works.
 *
 * Sessions are Bearer tokens the browser keeps in plain, JS-readable cookies
 * (`sc.access_token` for students, `sc.admin_access_token` for admins — kept
 * distinct because the backend enforces two identity realms). Server
 * components forward the cookie value as `Authorization: Bearer …`.
 */

export const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://api.scholarscrib.com"
    : "http://localhost:8000");

/** Cookie carrying the student access token. JS-readable, path=/ */
export const ACCESS_COOKIE = "sc.access_token";

/** Cookie carrying the admin access token. JS-readable, path=/ */
export const ADMIN_ACCESS_COOKIE = "sc.admin_access_token";

/** Cookie carrying the access token, chosen by identity realm. */
export function accessCookieFor(path: string): string {
  return path.startsWith("/admin") ? ADMIN_ACCESS_COOKIE : ACCESS_COOKIE;
}

/**
 * The backend hosts its own docs and health probe. Useful for the status page
 * and tests, not for the application flow.
 */
export function apiBaseUrl(): string {
  return API_URL;
}