/**
 * Browser session storage for the ScholarsCrib API's Bearer tokens.
 *
 * Student and admin tokens live in separate plain (JS-readable) cookies so
 * server components can forward them as `Authorization: Bearer` and the
 * browser can attach them to cross-origin calls. `max-age` mirrors the
 * backend's long-lived JWT; a short max-age just forces an earlier silent
 * re-login, so keep it comfortably past the token's own lifetime.
 */
"use client";

import { getAccessToken } from "@/lib/api/client";
import type { AuthRealm } from "@/lib/api/client";
import {
  ACCESS_COOKIE,
  ADMIN_ACCESS_COOKIE,
  LEGACY_TUTOR_ACCESS_COOKIE,
  TUTOR_ACCESS_COOKIE,
  TUTOR_ACCESS_COOKIE_PATH,
} from "@/lib/api/config";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { resetPostHog } from "@/lib/posthog-browser";
import { logoutTawkVisitor } from "@/lib/tawk-browser";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function writeCookie(name: string, value: string, path = "/"): void {
  const secure = typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=${path}; max-age=${MAX_AGE_SECONDS}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function setStudentToken(token: string): void {
  writeCookie(ACCESS_COOKIE, token);
}

export function setAdminToken(token: string): void {
  writeCookie(ADMIN_ACCESS_COOKIE, token);
}

export function setTutorToken(token: string): void {
  // Match BE cookie path so the proxy gate on /center/* sees the same cookie.
  writeCookie(TUTOR_ACCESS_COOKIE, token, TUTOR_ACCESS_COOKIE_PATH);
  // Drop the M0 mismatched name if a prior session left it behind.
  clearCookie(LEGACY_TUTOR_ACCESS_COOKIE, "/");
}

function clearCookie(name: string, path = "/"): void {
  const secure = typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = `${name}=; Max-Age=0; path=${path}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function clearStudentToken(): void {
  clearCookie(ACCESS_COOKIE);
}

export function clearAdminToken(): void {
  clearCookie(ADMIN_ACCESS_COOKIE);
}

export function clearTutorToken(): void {
  clearCookie(TUTOR_ACCESS_COOKIE, TUTOR_ACCESS_COOKIE_PATH);
  clearCookie(LEGACY_TUTOR_ACCESS_COOKIE, "/");
}

async function postLogout(path: string, realm: AuthRealm): Promise<void> {
  try {
    // `anonymous` keeps a 401 from bouncing to the session-expired redirect, so
    // the bearer is attached by hand: the backend needs it to revoke the token.
    const token = getAccessToken(undefined, realm);
    await request({
      method: "POST",
      url: path,
      anonymous: true,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch {
    // The token is cleared regardless: a logout that cannot reach the backend
    // must still look signed out locally.
  }
}

/**
 * Ends the student session on the backend, clears the local token and leaves
 * the visitor on the login page. Call from the user menu and the complete
 * profile step.
 */
export async function studentLogout(callbackUrl = "/login"): Promise<void> {
  await postLogout(endpoints.auth.logout, "student");
  clearStudentToken();
  resetPostHog();
  logoutTawkVisitor();
  // replace, not assign: Back must not land on the signed-in page.
  window.location.replace(callbackUrl);
}

/**
 * Ends the student session locally after the account was deleted. No logout
 * request: the user no longer exists, so the backend would only answer 401.
 */
export function studentAccountDeleted(callbackUrl = "/login?deleted=1"): void {
  clearStudentToken();
  resetPostHog();
  logoutTawkVisitor();
  window.location.replace(callbackUrl);
}

/**
 * Ends the admin session on the backend, clears the local token and leaves
 * the visitor on the admin login page. The student token is untouched.
 */
export async function adminLogout(callbackUrl = "/admin/login"): Promise<void> {
  await postLogout(endpoints.admin.auth.logout, "admin");
  clearAdminToken();
  resetPostHog();
  window.location.replace(callbackUrl);
}

/**
 * Ends the tutor session on the backend, clears the local tutor token and
 * leaves the visitor on the center login page. Student/admin cookies are
 * untouched — the realms are independent.
 */
export async function tutorLogout(callbackUrl = "/center/login"): Promise<void> {
  await postLogout(endpoints.centerApi.auth.logout, "tutor");
  clearTutorToken();
  resetPostHog();
  window.location.replace(callbackUrl);
}