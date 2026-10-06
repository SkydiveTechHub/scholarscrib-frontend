/**
 * Server-side transport: reads the access-token cookie from the request and
 * calls the FastAPI backend with `Authorization: Bearer`. Used by server
 * components, route handlers and the proxy's friends. Never imported from a
 * client component (would leak API_URL and pull server-only into the bundle).
 */
import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { API_URL, accessCookieFor } from "./config";
import { ApiError } from "./errors";
import type { ApiErrorBody } from "./types";

type FetchOptions = Omit<RequestInit, "body"> & {
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  /** Fetch without the token cookie (public endpoints). */
  anonymous?: boolean;
  /** Send the other realm's token (admin calls from a student context is never valid). */
  realm?: "student" | "admin";
};

async function resolveToken(
  path: string,
  realm: "student" | "admin",
): Promise<string | null> {
  const store = await cookies();
  const name =
    realm === "admin" && !path.startsWith("/admin")
      ? "sc.admin_access_token"
      : accessCookieFor(path);
  return store.get(name)?.value ?? null;
}

function buildUrl(path: string, params?: FetchOptions["params"]): string {
  const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseBody<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

export async function api<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { params, body, anonymous = false, realm = "auto", ...init } = options;
  const resolvedRealm: "student" | "admin" =
    realm === "auto"
      ? (path.startsWith("/admin") ? "admin" : "student")
      : realm;
  const token = await resolveToken(path, resolvedRealm);

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (token && !anonymous) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(buildUrl(path, params), {
    ...init,
    // fetch rejects a body on GET; a call that sends one without naming a
    // method means POST.
    method: init.method ?? (body === undefined ? "GET" : "POST"),
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    // The API is a separate origin; Next's data cache must not treat its
    // responses as static. Only the caller's explicit `next` opts opt in.
    cache: "no-store",
  });

  if (!res.ok) {
    const errorBody = await parseBody<ApiErrorBody>(res);
    throw new ApiError(res.status, errorBody ?? {});
  }

  return parseBody<T>(res);
}

export type Api = typeof api;

/** Form-parse helper for the multipart avatar route. */
export async function apiForm<T>(
  path: string,
  form: FormData,
  options: Omit<FetchOptions, "body"> = {},
): Promise<T> {
  const { anonymous = false, realm = "auto", ...init } = options;
  const token = accessCookieFor(path) ? await resolveToken(path, path.startsWith("/admin") ? "admin" : "student") : null;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (token && !anonymous) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(buildUrl(path, options.params), {
    ...init,
    method: "POST",
    headers,
    body: form,
    cache: "no-store",
  });

  if (!res.ok) {
    const errorBody = await parseBody<ApiErrorBody>(res);
    throw new ApiError(res.status, errorBody ?? {});
  }

  return parseBody<T>(res);
}

/**
 * Per-request memoiser for server component data reads. A page calling
 * `getDashboard()` twice in one request gets one HTTP call.
 */
export function memoized<TFn extends (...args: never[]) => Promise<unknown>>(
  fn: TFn,
): TFn {
  return cache(fn);
}