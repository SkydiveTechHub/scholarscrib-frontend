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
import { ACCESS_COOKIE, ADMIN_ACCESS_COOKIE } from "@/lib/api/config";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function writeCookie(name: string, value: string): void {
  const secure = typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function setStudentToken(token: string): void {
  writeCookie(ACCESS_COOKIE, token);
}

export function setAdminToken(token: string): void {
  writeCookie(ADMIN_ACCESS_COOKIE, token);
}

function clearCookie(name: string): void {
  const secure = typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function clearStudentToken(): void {
  clearCookie(ACCESS_COOKIE);
}

export function clearAdminToken(): void {
  clearCookie(ADMIN_ACCESS_COOKIE);
}

async function postLogout(path: string, realm: "student" | "admin"): Promise<void> {
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
  // replace, not assign: Back must not land on the signed-in page.
  window.location.replace(callbackUrl);
}

/**
 * Ends the admin session on the backend, clears the local token and leaves
 * the visitor on the admin login page. The student token is untouched.
 */
export async function adminLogout(callbackUrl = "/admin/login"): Promise<void> {
  await postLogout(endpoints.admin.auth.logout, "admin");
  clearAdminToken();
  window.location.replace(callbackUrl);
}