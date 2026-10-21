import { test } from "node:test";
import assert from "node:assert/strict";
import { errorCodeForStatus, streamTutorReply } from "../src/lib/tutor/client";
import type { ApiError } from "../src/lib/api/errors";
import type { TutorStreamEvent } from "../src/lib/tutor/types";

const ARGS = {
  threadId: "t1",
  content: "hi",
};

function streamOf(text: string, splitAt: number[] = []): Response {
  const bytes = new TextEncoder().encode(text);
  const cuts = [0, ...splitAt, bytes.length];
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < cuts.length - 1; i++) {
        controller.enqueue(bytes.slice(cuts[i], cuts[i + 1]));
      }
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

async function collect(gen: AsyncGenerator<TutorStreamEvent>) {
  const out: TutorStreamEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

const FRAMES =
  'event: userMessage\ndata: {"id":"u","role":"user","content":"hi","groundedOn":[]}\n\n' +
  'event: token\ndata: {"text":"₦500"}\n\n' +
  'event: assistantMessage\ndata: {"id":"a","role":"assistant","content":"₦500","groundedOn":[]}\n\n' +
  'event: done\ndata: {"ok":true}\n\n';

test("decodes a multibyte character split across network chunks", async () => {
  const bytes = new TextEncoder().encode(FRAMES);
  const mid = bytes.indexOf(0xe2) + 1; // inside the 3-byte "₦"
  const events = await collect(
    streamTutorReply(ARGS, {
      token: "t",
      fetchImpl: async () => streamOf(FRAMES, [mid]),
    }),
  );
  assert.deepEqual(events.map((e) => e.type), [
    "userMessage",
    "token",
    "assistantMessage",
    "done",
  ]);
  assert.equal(events[1].type === "token" && events[1].text, "₦500");
});

test("sends bearer token, JSON body and an SSE accept header", async () => {
  let seen: { url: string; init: RequestInit } | null = null;
  await collect(
    streamTutorReply(ARGS, {
      token: "tok",
      baseUrl: "http://api.test",
      fetchImpl: async (url, init) => {
        seen = { url: String(url), init: init as RequestInit };
        return streamOf(FRAMES);
      },
    }),
  );
  assert.ok(seen);
  const { url, init } = seen as { url: string; init: RequestInit };
  assert.equal(url, "http://api.test/api/tutor/threads/t1/messages/stream");
  const headers = init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer tok");
  assert.equal(headers.Accept, "text/event-stream");
  assert.deepEqual(JSON.parse(String(init.body)), { content: "hi" });
});

test("a stream that ends without done yields a retryable error", async () => {
  const cut =
    'event: userMessage\ndata: {"id":"u","role":"user","content":"hi","groundedOn":[]}\n\n';
  const events = await collect(
    streamTutorReply(ARGS, { token: "t", fetchImpl: async () => streamOf(cut) }),
  );
  const last = events[events.length - 1];
  assert.equal(last.type, "error");
  assert.equal(last.type === "error" && last.code, "UNAVAILABLE");
});

test("429 yields RATE_LIMITED with resetsAt from the body", async () => {
  const events = await collect(
    streamTutorReply(ARGS, {
      token: "t",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            error: "Used up",
            code: "RATE_LIMITED",
            resetsAt: "2026-10-21T00:00:00Z",
          }),
          { status: 429, headers: { "Retry-After": "45" } },
        ),
    }),
  );
  assert.deepEqual(events, [
    {
      type: "error",
      code: "RATE_LIMITED",
      message: "Used up",
      resetsAt: "2026-10-21T00:00:00Z",
      retryAfterSec: 45,
    },
  ]);
});

test("503 yields calm unavailable copy", async () => {
  const events = await collect(
    streamTutorReply(ARGS, {
      token: "t",
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: "AI tutor is disabled" }), {
          status: 503,
        }),
    }),
  );
  assert.equal(events[0]?.type, "error");
  if (events[0]?.type === "error") {
    assert.equal(events[0].code, "UNAVAILABLE");
    assert.match(events[0].message, /offline|disabled/i);
  }
});

test("401 throws ApiError so the caller can sign out", async () => {
  await assert.rejects(
    collect(
      streamTutorReply(ARGS, {
        token: "t",
        fetchImpl: async () =>
          new Response(JSON.stringify({ error: "no" }), { status: 401 }),
      }),
    ),
    (err: unknown) =>
      (err as ApiError).name === "ApiError" && (err as ApiError).isAuthFailure,
  );
});

test("status → code mapping", () => {
  assert.equal(errorCodeForStatus(402), "TIER_REQUIRED");
  assert.equal(errorCodeForStatus(403), "TIER_REQUIRED");
  assert.equal(errorCodeForStatus(404), "CONTEXT_NOT_FOUND");
  assert.equal(errorCodeForStatus(429), "RATE_LIMITED");
  assert.equal(errorCodeForStatus(503), "UNAVAILABLE");
  assert.equal(errorCodeForStatus(500), "UNAVAILABLE");
});
