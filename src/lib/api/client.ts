/**
 * Browser token helpers: read and clear the JS-readable access-token cookies.
 * The HTTP client itself lives in ./http (axios); hooks in @/hooks/api call it.
 */
import {
  ACCESS_COOKIE,
  ADMIN_ACCESS_COOKIE,
  LEGACY_TUTOR_ACCESS_COOKIE,
  TUTOR_ACCESS_COOKIE,
  TUTOR_ACCESS_COOKIE_PATH,
} from "./config";

export type AuthRealm = "student" | "admin" | "tutor";

function realmForPath(path: string): AuthRealm {
  if (path.startsWith("/admin") && !path.startsWith("/admin/api/auth")) {
    return "admin";
  }
  if (path.startsWith("/center")) return "tutor";
  return "student";
}

function cookieForRealm(realm: AuthRealm): string {
  if (realm === "admin") return ADMIN_ACCESS_COOKIE;
  if (realm === "tutor") return TUTOR_ACCESS_COOKIE;
  return ACCESS_COOKIE;
}

export function getAccessToken(
  path = window.location.pathname,
  realm?: AuthRealm,
): string | null {
  if (typeof document === "undefined") return null;
  return readCookie(cookieForRealm(realm ?? realmForPath(path)));
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split(";")
    .map((pair) => pair.trim())
    .find((pair) => pair.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function clearBrowserCookie(name: string, path: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=0; path=${path}; SameSite=Lax`;
}

export function clearStudentToken(): void {
  clearBrowserCookie(ACCESS_COOKIE, "/");
}

export function clearAdminToken(): void {
  clearBrowserCookie(ADMIN_ACCESS_COOKIE, "/");
}

export function clearTutorToken(): void {
  clearBrowserCookie(TUTOR_ACCESS_COOKIE, TUTOR_ACCESS_COOKIE_PATH);
  clearBrowserCookie(LEGACY_TUTOR_ACCESS_COOKIE, "/");
}
