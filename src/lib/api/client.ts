/**
 * Browser token helpers: read and clear the JS-readable access-token cookies.
 * The HTTP client itself lives in ./http (axios); hooks in @/hooks/api call it.
 */
import { ACCESS_COOKIE, ADMIN_ACCESS_COOKIE } from "./config";

function realmForPath(path: string): "student" | "admin" {
  return path.startsWith("/admin") && !path.startsWith("/admin/api/auth")
    ? "admin"
    : "student";
}

export function getAccessToken(
  path = window.location.pathname,
  realm?: "student" | "admin",
): string | null {
  if (typeof document === "undefined") return null;
  const name = (realm ?? realmForPath(path)) === "admin"
    ? ADMIN_ACCESS_COOKIE
    : ACCESS_COOKIE;
  return readCookie(name);
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split(";")
    .map((pair) => pair.trim())
    .find((pair) => pair.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function clearStudentToken(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ACCESS_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
}

export function clearAdminToken(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ADMIN_ACCESS_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
}
