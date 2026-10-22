import { getAccessToken } from "@/lib/api/client";
import { API_URL } from "@/lib/api/config";
import { endpoints } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { ApiErrorBody } from "@/lib/api/types";
import { decodeFrame } from "./events";
import { createSseParser } from "./sse";
import type { TutorStreamEvent, TutorThreadCreateBody } from "./types";

// Axios cannot stream in the browser, so the one streaming call bypasses
// `request()` and talks to `fetch` with the same bearer token. Everything else
// about the tutor goes through the normal hooks.

/**
 * Either continue `threadId`, or (no threadId) start a new thread from
 * `create` -- the server makes the thread when this first message arrives.
 */
export type StreamArgs = {
  threadId?: string | null;
  create?: TutorThreadCreateBody;
  content: string;
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
  if (status === 409) return "ACTION_PENDING";
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

function retryAfterSec(res: Response): number | undefined {
  const raw = res.headers.get("Retry-After");
  if (!raw) return undefined;
  const sec = Number(raw);
  return Number.isFinite(sec) && sec > 0 ? sec : undefined;
}

function fallbackErrorMessage(status: number): string {
  if (status === 409) {
    return "Approve or dismiss Astra's suggestion before sending another message.";
  }
  if (status === 503) return "Astra is offline right now.";
  return "Astra isn't available right now.";
}

type OpenStream = {
  method: "POST" | "GET";
  body?: unknown;
  headers?: Record<string, string>;
  /** 404 means the run already finished and the thread GET has the reply. */
  finishedOn404?: boolean;
};

/**
 * Read an SSE body. Chat turns and action resumes POST JSON. A rejoin GETs
 * the run that is still going.
 */
async function* openEventStream(
  path: string,
  req: OpenStream,
  opts: StreamOptions,
): AsyncGenerator<TutorStreamEvent> {
  const doFetch = opts.fetchImpl ?? fetch;
  const token =
    opts.token === undefined ? getAccessToken("", "student") : opts.token;

  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    ...req.headers,
  };
  if (req.method === "POST") headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await doFetch(`${opts.baseUrl ?? API_URL}${path}`, {
    method: req.method,
    headers,
    signal: opts.signal,
    body: req.method === "POST" ? JSON.stringify(req.body) : undefined,
  });

  if (res.status === 404 && req.finishedOn404) {
    yield {
      type: "error",
      code: "RUN_FINISHED",
      message: "Astra finished this reply.",
    };
    return;
  }

  if (!res.ok) {
    const errorBody = await readErrorBody(res);
    if (res.status === 401) throw new ApiError(401, errorBody);
    yield {
      type: "error",
      code: errorBody.code ?? errorCodeForStatus(res.status),
      message: errorBody.error ?? fallbackErrorMessage(res.status),
      resetsAt: errorBody.resetsAt,
      retryAfterSec: retryAfterSec(res),
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
    dropped: true,
  };
}

export async function* streamTutorReply(
  args: StreamArgs,
  opts: StreamOptions = {},
): AsyncGenerator<TutorStreamEvent> {
  const path = args.threadId
    ? endpoints.tutor.messagesStream(args.threadId)
    : endpoints.tutor.threadsStream;
  const body = args.threadId
    ? { content: args.content }
    : { ...args.create, firstMessage: args.content };
  yield* openEventStream(path, { method: "POST", body }, opts);
}

export type RunStreamArgs = {
  threadId: string;
  runId: string;
  lastEventId?: string | null;
};

/** Attach to a run that outlived the previous socket. */
export async function* streamTutorRun(
  args: RunStreamArgs,
  opts: StreamOptions = {},
): AsyncGenerator<TutorStreamEvent> {
  const headers: Record<string, string> = {};
  if (args.lastEventId) headers["Last-Event-ID"] = args.lastEventId;
  yield* openEventStream(
    endpoints.tutor.runStream(args.threadId, args.runId),
    { method: "GET", headers, finishedOn404: true },
    opts,
  );
}

export type ResumeActionArgs = {
  threadId: string;
  approved: boolean;
  actionId: string;
  /** Replaces the proposed payload. Omit to run what Astra proposed. */
  args?: unknown;
};

/** Approve or dismiss a paused card. `stream: true` so the follow-up arrives as SSE. */
export async function* streamTutorAction(
  args: ResumeActionArgs,
  opts: StreamOptions = {},
): AsyncGenerator<TutorStreamEvent> {
  yield* openEventStream(
    endpoints.tutor.actionsResume(args.threadId),
    {
      method: "POST",
      body: {
        approved: args.approved,
        actionId: args.actionId,
        args: args.args === undefined ? null : args.args,
        stream: true,
      },
    },
    opts,
  );
}
