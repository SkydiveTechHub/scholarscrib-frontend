import { getAccessToken } from "@/lib/api/client";
import { API_URL } from "@/lib/api/config";
import { endpoints } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { ApiErrorBody } from "@/lib/api/types";
import { decodeFrame } from "./events";
import { createSseParser } from "@/lib/tutor/sse";
import type { AstraStreamEvent } from "./types";

export type StreamOptions = {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  /** undefined reads the tutor cookie; null sends no header. */
  token?: string | null;
  baseUrl?: string;
};

type OpenStream = {
  method: "POST" | "GET";
  body?: unknown;
  headers?: Record<string, string>;
  /** 404 on a rejoin means the run finished. A thread 404 does not. */
  finishedOn404?: boolean;
};

type ErrorBody = ApiErrorBody & {
  topUpPath?: string;
  balance?: number;
};

async function readErrorBody(res: Response): Promise<ErrorBody> {
  try {
    const body: unknown = await res.json();
    return body && typeof body === "object" ? (body as ErrorBody) : {};
  } catch {
    return {};
  }
}

function tokenEmptyCode(errorBody: ErrorBody): string {
  const code = (errorBody.code ?? "").toUpperCase();
  if (
    code === "CENTER_ASTRA_TOKENS_EMPTY" ||
    code === "TOKEN_BALANCE_EMPTY" ||
    code === "INSUFFICIENT_TOKENS" ||
    code === "TOKENS_REQUIRED" ||
    code === "AI_TOKENS_EMPTY"
  ) {
    return "TOKEN_BALANCE_EMPTY";
  }
  return "TOKEN_BALANCE_EMPTY";
}

async function* openEventStream(
  path: string,
  req: OpenStream,
  opts: StreamOptions,
): AsyncGenerator<AstraStreamEvent> {
  const doFetch = opts.fetchImpl ?? fetch;
  const token = opts.token === undefined ? getAccessToken("", "tutor") : opts.token;
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
    yield { type: "error", code: "RUN_FINISHED", message: "Astra finished this reply." };
    return;
  }

  if (!res.ok) {
    const errorBody = await readErrorBody(res);
    if (res.status === 401) throw new ApiError(401, errorBody);
    if (res.status === 402) {
      yield {
        type: "error",
        code: tokenEmptyCode(errorBody),
        message:
          errorBody.error ??
          "This center is out of AI tokens. Top up to keep chatting with Astra.",
      };
      return;
    }
    if (res.status === 409) {
      const running = /still running/i.test(errorBody.error ?? "");
      yield {
        type: "error",
        code: "CONFLICT",
        running,
        message: running
          ? (errorBody.error ?? "A reply is still running")
          : "Approve or dismiss the draft first.",
      };
      return;
    }
    if (res.status === 400 || res.status === 422) {
      yield {
        type: "error",
        code: "INVALID",
        message: errorBody.error ?? "Check that and try again.",
      };
      return;
    }
    if (res.status === 404) {
      yield { type: "error", code: "NOT_FOUND", message: errorBody.error ?? "Thread not found" };
      return;
    }
    yield {
      type: "error",
      code: "UNAVAILABLE",
      message: errorBody.error ?? "Astra isn't available right now.",
    };
    return;
  }

  if (!res.body) {
    yield { type: "error", code: "UNAVAILABLE", message: "Astra didn't reply. Please try again." };
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

export async function* streamCenterAstraReply(
  args: { centerId: string; threadId: string; content: string },
  opts: StreamOptions = {},
): AsyncGenerator<AstraStreamEvent> {
  yield* openEventStream(
    endpoints.centerApi.astra.messagesStream(args.centerId, args.threadId),
    { method: "POST", body: { content: args.content } },
    opts,
  );
}

export async function* streamCenterAstraRun(
  args: {
    centerId: string;
    threadId: string;
    runId: string;
    lastEventId?: string | null;
  },
  opts: StreamOptions = {},
): AsyncGenerator<AstraStreamEvent> {
  const headers: Record<string, string> = {};
  if (args.lastEventId) headers["Last-Event-ID"] = args.lastEventId;
  yield* openEventStream(
    endpoints.centerApi.astra.runStream(args.centerId, args.threadId, args.runId),
    { method: "GET", headers, finishedOn404: true },
    opts,
  );
}

export async function* streamCenterAstraAction(
  args: {
    centerId: string;
    threadId: string;
    approved: boolean;
    actionId: string;
    args?: Record<string, unknown> | null;
  },
  opts: StreamOptions = {},
): AsyncGenerator<AstraStreamEvent> {
  yield* openEventStream(
    endpoints.centerApi.astra.actionsResume(args.centerId, args.threadId),
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

/** Cancel the live run. Omitting streamId stops whatever is running on the thread. */
export async function stopCenterAstraRun(
  args: { centerId: string; threadId: string; streamId?: string | null },
  opts: StreamOptions = {},
): Promise<void> {
  const doFetch = opts.fetchImpl ?? fetch;
  const token = opts.token === undefined ? getAccessToken("", "tutor") : opts.token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await doFetch(
    `${opts.baseUrl ?? API_URL}${endpoints.centerApi.astra.messagesStop(args.centerId, args.threadId)}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(args.streamId ? { streamId: args.streamId } : {}),
    },
  );
  if (res.status === 401) throw new ApiError(401, {});
}
