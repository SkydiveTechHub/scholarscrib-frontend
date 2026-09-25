/**
 * Browser transport: reads the access-token cookie with plain JS, attaches
 * `Authorization: Bearer`, and calls the backend's public origin directly.
 * Used by client components and forms. On a 401/403 it clears the token and
 * sends the visitor to the right sign-in page.
 */
import { ACCESS_COOKIE, ADMIN_ACCESS_COOKIE, API_URL } from "./config";
import { ApiError } from "./errors";
import type { ApiErrorBody } from "./types";

type FetchOptions = Omit<RequestInit, "body"> & {
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  /** Skip the bearer header and the auth-failure redirect (public and login flows). */
  anonymous?: boolean;
  /** Which token to attach; defaults to a path-based guess. */
  realm?: "student" | "admin";
  /** Legacy alias for `anonymous`. */
  raw?: boolean;
};

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

/** Clears both realms; used when an account's tokens must not survive. */
export function clearTokens(): void {
  if (typeof document === "undefined") return;
  for (const name of [ACCESS_COOKIE, ADMIN_ACCESS_COOKIE]) {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
  }
}

export function clearStudentToken(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ACCESS_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
}

export function clearAdminToken(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ADMIN_ACCESS_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
}

/**
 * A signed-out token should never linger: clear it before redirecting so the
 * (auth) layout's authoritative check and the target page agree.
 */
function afterAuthFailure(path: string): void {
  const isAdmin = realmForPath(path) === "admin";
  if (isAdmin) clearAdminToken();
  else clearStudentToken();
  const target = isAdmin
    ? "/admin/login?reason=session"
    : "/login?reason=session";
  window.location.assign(target);
}

export async function fetchApi<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { params, body, anonymous = false, realm, raw = false, ...init } = options;
  const skipAuth = anonymous || raw;
  const token = getAccessToken(path, realm);

  const url = new URL(
    path.startsWith("http")
      ? path
      : `${process.env.NEXT_PUBLIC_API_URL ?? API_URL}${path}`,
  );
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  // JSON bodies opt into the content type; FormData is sent as-is by the
  // browser so the backend's multipart uploads keep working.
  if (body !== undefined && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !skipAuth) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url.toString(), {
    ...init,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    let errorBody: ApiErrorBody = {};
    try {
      errorBody = text ? (JSON.parse(text) as ApiErrorBody) : {};
    } catch {
      errorBody = { error: text };
    }
    const error = new ApiError(res.status, errorBody);
    // Never redirect during a public/login flow: an "invalid credentials"
    // 401 must show the form's error, not bounce the user around.
    if (!error.isAuthFailure || !skipAuth) {
      const isLoginFlow =
        path.endsWith("/api/auth/login") ||
        path.endsWith("/api/auth/register") ||
        path.endsWith("/api/auth/google") ||
        path.endsWith("/admin/api/auth/login");
      if (error.isAuthFailure && !isLoginFlow) afterAuthFailure(path);
    }
    throw error;
  }

  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}