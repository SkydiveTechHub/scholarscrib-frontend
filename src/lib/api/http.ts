/**
 * Browser HTTP client: one axios instance pointed at the backend's public
 * origin. Attaches `Authorization: Bearer` from the realm's cookie, turns
 * backend error responses into `ApiError`, and on a 401/403 outside the
 * sign-in flows clears the token and sends the visitor to sign in.
 *
 * Requests that never got a response (offline, CORS, DNS) are rethrown as
 * the original AxiosError; `isApiError` is false for them.
 */
"use client";

import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { clearAdminToken, clearStudentToken, getAccessToken } from "./client";
import { API_URL } from "./config";
import { endpoints } from "./endpoints";
import { ApiError } from "./errors";
import type { ApiErrorBody } from "./types";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Skip the bearer header and the auth-failure redirect (public and login flows). */
    anonymous?: boolean;
    /** Which token to attach; defaults to a path-based guess. */
    realm?: "student" | "admin";
  }
}

const SIGN_IN_PATHS: readonly string[] = [
  endpoints.auth.login,
  endpoints.auth.register,
  endpoints.auth.google,
  endpoints.admin.auth.login,
];

function isAdminRealm(path: string, realm?: "student" | "admin"): boolean {
  if (realm) return realm === "admin";
  return path.startsWith("/admin") && !path.startsWith("/admin/api/auth");
}

export const http = axios.create({
  baseURL: API_URL,
  headers: { Accept: "application/json" },
});

http.interceptors.request.use((config) => {
  if (!config.anonymous) {
    const token = getAccessToken(config.url ?? "", config.realm);
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

http.interceptors.response.use(undefined, (error: unknown) => {
  if (!(error instanceof AxiosError) || !error.response) throw error;

  const { data, status } = error.response;
  const body: ApiErrorBody =
    data && typeof data === "object"
      ? (data as ApiErrorBody)
      : { error: typeof data === "string" && data ? data : undefined };
  const apiError = new ApiError(status, body);

  const config = error.config;
  const path = config?.url ?? "";
  // Never redirect during a public/login flow: an "invalid credentials" 401
  // must show the form's error, not bounce the user around.
  if (apiError.isAuthFailure && !config?.anonymous && !SIGN_IN_PATHS.includes(path)) {
    const admin = isAdminRealm(path, config?.realm);
    if (admin) clearAdminToken();
    else clearStudentToken();
    window.location.assign(
      admin ? "/admin/login?reason=session" : "/login?reason=session",
    );
  }
  throw apiError;
});

/** Unwraps `response.data` so hooks deal in payloads, not axios responses. */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await http.request<T>(config);
  return res.data;
}
