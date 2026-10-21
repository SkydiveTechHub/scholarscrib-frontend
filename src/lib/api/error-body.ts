import type { ApiErrorBody } from "./types";

/**
 * The error payload of a failed response. Requests made with
 * `responseType: "blob"` (file downloads) deliver the backend's JSON error as
 * a Blob, so it is read back here instead of being lost.
 */
export async function readErrorBody(data: unknown): Promise<ApiErrorBody> {
  let body = data;
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    try {
      body = JSON.parse(await body.text());
    } catch {
      return {};
    }
  }
  if (body && typeof body === "object") return body as ApiErrorBody;
  return { error: typeof body === "string" && body ? body : undefined };
}
