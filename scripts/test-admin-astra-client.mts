import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stopAdminAstraRun,
  streamAdminAstraReply,
  streamAdminAstraRun,
} from "../src/lib/admin-astra/client";
import type { AstraStreamEvent } from "../src/lib/admin-astra/types";

function streamOf(text: string, status = 200): Response {
  const bytes = new TextEncoder().encode(text);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return new Response(body, { status, headers: { "content-type": "text/event-stream" } });
}

async function collect(gen: AsyncGenerator<AstraStreamEvent>) {
  const out: AstraStreamEvent[] = [];
  for await (const event of gen) out.push(event);
  return out;
}

const DONE =
  'event: done\ndata: {"ok":true,"streamId":"run-1","runId":"run-1"}\n\n';

test("streams with the admin bearer and the content body", async () => {
  let seen: { url: string; init: RequestInit } | null = null;
  const events = await collect(
    streamAdminAstraReply(
      { threadId: "thread 1", content: "Find Ada" },
      {
        token: "admin-tok",
        baseUrl: "http://api.test",
        fetchImpl: async (url, init) => {
          seen = { url: String(url), init: init as RequestInit };
          return streamOf('id: 3\nevent: done\ndata: {"ok":true}\n\n');
        },
      },
    ),
  );
  assert.ok(seen);
  const hit = seen as { url: string; init: RequestInit };
  assert.equal(
    hit.url,
    "http://api.test/admin/api/astra/threads/thread%201/messages/stream",
  );
  const headers = hit.init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer admin-tok");
  assert.equal(hit.init.body, JSON.stringify({ content: "Find Ada" }));
  assert.equal(events[0]?.eventId, "3");
});

test("stop sends streamId when the run is known", async () => {
  let body = "";
  let url = "";
  await stopAdminAstraRun(
    { threadId: "t1", streamId: "run-9" },
    {
      token: "admin-tok",
      baseUrl: "http://api.test",
      fetchImpl: async (input, init) => {
        url = String(input);
        body = String(init?.body ?? "");
        return new Response("{}", { status: 200 });
      },
    },
  );
  assert.equal(url, "http://api.test/admin/api/astra/threads/t1/messages/stream/stop");
  assert.equal(body, JSON.stringify({ streamId: "run-9" }));
});

test("rejoin GETs the run and sends Last-Event-ID", async () => {
  let headers: Record<string, string> = {};
  let method = "";
  const events = await collect(
    streamAdminAstraRun(
      { threadId: "t1", runId: "run 1", lastEventId: "4" },
      {
        token: "admin-tok",
        baseUrl: "http://api.test",
        fetchImpl: async (_url, init) => {
          method = init?.method ?? "";
          headers = init?.headers as Record<string, string>;
          return streamOf("id: 5\n" + DONE);
        },
      },
    ),
  );
  assert.equal(method, "GET");
  assert.equal(headers["Last-Event-ID"], "4");
  assert.equal(headers.Authorization, "Bearer admin-tok");
  assert.equal(events.at(-1)?.type, "done");
});

test("a finished run is RUN_FINISHED, and a missing thread is NOT_FOUND", async () => {
  const finished = await collect(
    streamAdminAstraRun(
      { threadId: "t1", runId: "gone" },
      {
        token: "admin-tok",
        baseUrl: "http://api.test",
        fetchImpl: async () => new Response(JSON.stringify({ error: "Run not found" }), { status: 404 }),
      },
    ),
  );
  const missing = await collect(
    streamAdminAstraReply(
      { threadId: "missing", content: "hi" },
      {
        token: "admin-tok",
        baseUrl: "http://api.test",
        fetchImpl: async () => new Response(JSON.stringify({ error: "Thread not found" }), { status: 404 }),
      },
    ),
  );
  assert.equal(finished[0]?.type === "error" && finished[0].code, "RUN_FINISHED");
  assert.equal(missing[0]?.type === "error" && missing[0].code, "NOT_FOUND");
});
