/**
 * HTTP error raised by the API transport, shaped like the backend's error
 * convention (`{ "error": <sentence>, "details"? }`). Carries the raw status
 * so callers can branch on 401/403/409/422 without string-matching bodies.
 */
import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;
  /** `rate_limited` on a 429 from the login route; `""` otherwise. */
  readonly code: string;
  readonly reason: string;
  readonly requiredTier: string | null;
  readonly feature: string | null;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.code = body.code ?? "";
    this.reason = body.reason ?? "";
    this.requiredTier = body.requiredTier ?? null;
    this.feature = body.feature ?? null;
  }

  /** A 401/403 on a gated endpoint: the session is missing, stale or banned. */
  get isAuthFailure(): boolean {
    return this.status === 401 || this.status === 403;
  }

  get isRateLimited(): boolean {
    return this.status === 429 || this.code === "rate_limited";
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}