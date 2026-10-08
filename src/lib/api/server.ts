/**
 * Server-side transport: reads the access-token cookie from the request and
 * calls the FastAPI backend with `Authorization: Bearer`. Used by server
 * components, route handlers and the proxy's friends. Never imported from a
 * client component (would leak API_URL and pull server-only into the bundle).
 */
import "server-only";

import { cookies } from "next/headers";
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

const REQUEST_TIMEOUT_MS = 10_000;
/** Pauses before each retry of a GET; its length is the retry count. */
const RETRY_DELAYS_MS = [500, 1500];
/** Gateway errors a sleeping or restarting backend returns. */
const TRANSIENT_STATUSES = new Set([502, 503, 504]);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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

  // fetch rejects a body on GET; a call that sends one without naming a
  // method means POST.
  const method = init.method ?? (body === undefined ? "GET" : "POST");
  const url = buildUrl(path, params);
  // Only reads are retried: replaying a POST after a timeout could run it twice.
  const maxAttempts = method === "GET" ? RETRY_DELAYS_MS.length + 1 : 1;

  let res: Response | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const last = attempt === maxAttempts - 1;
    try {
      res = await fetch(url, {
        ...init,
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        // The API is a separate origin; Next's data cache must not treat its
        // responses as static. Only the caller's explicit `next` opts opt in.
        cache: "no-store",
        // A hung backend (cold start, dropped connection) must fail fast
        // enough to be retried rather than stall the page.
        signal: init.signal
          ? AbortSignal.any([init.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
          : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (last || init.signal?.aborted) throw error;
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }
    if (!last && TRANSIENT_STATUSES.has(res.status)) {
      await res.body?.cancel();
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }
    break;
  }
  if (!res) throw new Error("API request produced no response");

  if (!res.ok) {
    const errorBody = await parseBody<ApiErrorBody>(res);
    throw new ApiError(res.status, errorBody ?? {});
  }

  return parseBody<T>(res);
}

