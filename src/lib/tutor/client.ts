import { getAccessToken } from "@/lib/api/client";
import { API_URL } from "@/lib/api/config";
import { endpoints } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { ApiErrorBody } from "@/lib/api/types";
import { decodeFrame } from "./events";
import { createSseParser } from "./sse";
import type { TutorAction, TutorContext, TutorStreamEvent } from "./types";

// Axios cannot stream in the browser, so the one streaming call bypasses
// `request()` and talks to `fetch` with the same bearer token. Everything else
// about the tutor goes through the normal hooks.

export type StreamArgs = {
  threadId: string;
  text: string;
  action: TutorAction | null;
  context: TutorContext;
  clientMessageId: string;
};

export type StreamOptions = {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  /** undefined reads the student cookie; null sends no header. */
  token?: string | null;
  baseUrl?: string;
};

type ErrorBody = ApiErrorBody & { resetsAt?: string };

export function errorCodeForStatus(status: number): string {
  if (status === 402 || status === 403) return "TIER_REQUIRED";
  if (status === 404) return "CONTEXT_NOT_FOUND";
  if (status === 429) return "RATE_LIMITED";
  return "UNAVAILABLE";
}

async function readErrorBody(res: Response): Promise<ErrorBody> {
  try {
    const body: unknown = await res.json();
    return body && typeof body === "object" ? (body as ErrorBody) : {};
  } catch {
    return {};
  }
}

export async function* streamTutorReply(
  args: StreamArgs,
  opts: StreamOptions = {},
): AsyncGenerator<TutorStreamEvent> {
  const doFetch = opts.fetchImpl ?? fetch;
  const token =
    opts.token === undefined ? getAccessToken("", "student") : opts.token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await doFetch(
    `${opts.baseUrl ?? API_URL}${endpoints.tutor.messages(args.threadId)}`,
    {
      method: "POST",
      headers,
      signal: opts.signal,
      body: JSON.stringify({
        text: args.text,
        action: args.action,
        context: args.context,
        clientMessageId: args.clientMessageId,
      }),
    },
  );

  if (!res.ok) {
    const body = await readErrorBody(res);
    if (res.status === 401) throw new ApiError(401, body);
    yield {
      type: "error",
      code: body.code ?? errorCodeForStatus(res.status),
      message: body.error ?? "Astra isn't available right now.",
      resetsAt: body.resetsAt,
    };
    return;
  }

  if (!res.body) {
    yield {
      type: "error",
      code: "UNAVAILABLE",
      message: "Astra didn't reply. Please try again.",
    };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // `stream: true` holds back a half-received character until its
      // remaining bytes arrive.
      for (const frame of parser.push(decoder.decode(value, { stream: true }))) {
        const event = decodeFrame(frame);
        if (!event) continue;
        yield event;
        if (event.type === "done" || event.type === "error") return;
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield {
    type: "error",
    code: "UNAVAILABLE",
    message: "The connection dropped before Astra finished.",
  };
}
