# Astra Tutor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Astra tutor panel in the student dashboard (mobile bottom sheet, desktop right dock) with a streaming chat client that implements the BE contract in the spec.

**Architecture:** Pure, unit-tested logic lives in `src/lib/tutor/` (types, SSE parser, stream client, context/chips, chat reducer). A Zustand store holds open/context state. One lazily-loaded panel is mounted once in the dashboard layout; entry points (sidebar, mobile menu, lesson pill, "Explain this" on practice results) only set context in the store. The BE is not built yet, so every FE behaviour is tested against a shared SSE fixture.

**Tech Stack:** Next.js 16 (App Router), React 19, TanStack Query 5, Zustand 5, Zod 4, Tailwind 4, `react-icons/lu`, node:test via `tsx`.

**Spec:** `docs/superpowers/specs/2026-10-20-astra-tutor-design.md`

## Global Constraints

- **Read `node_modules/next/dist/docs/` before touching routing/layout/dynamic-import code** (`AGENTS.md`: this Next.js has breaking changes).
- Backend routes are `/api/tutor/...` (the FE `endpoints.ts` and the BE `APIRouter(prefix="/api")` use `/api`; the spec's `/student/tutor` shorthand maps to this).
- Tests: `scripts/test-*.mts`, `node:test` + `node:assert/strict`, import source with relative paths (`../src/...`). Run one: `node --import tsx --test --test-force-exit scripts/test-tutor-sse.mts`. Run all: `npm test`. Type-check tests: `npm run typecheck:tests`. Lint: `npm run lint`.
- `src/` targets ES2017: use `BigInt(0)` not `0n`.
- Colours/tokens: use existing Tailwind tokens (`bg-card`, `text-muted`, `border-border`, `bg-primary-soft`, `text-primary`, `bg-secondary`). Dark mode comes free from the tokens; never hard-code hex.
- Icons: `react-icons/lu` only (`LuStar`, `LuX`, …).
- Text limit per message: **500 characters**, enforced in the composer and the sender.
- Tier gate: `aiTutor` → `PREMIUM`. Failing closed: unknown tier = `FREEMIUM` (`tierOf`).
- No raw HTML from replies; Markdown + KaTeX only, rendered by `MarkdownBase`.
- No tutor during exams: pill, sidebar entry and panel are disabled/closed while `useExamActive()` is true.
- Persona name is **Astra**; subline "Your study buddy"; never "AI assistant"; at most one emoji in copy.
- Commit after each task; commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Stream cut mid-multibyte char** (e.g. `₦`, `÷`, Yoruba `ṣ`) — must decode intact (Task 3 test).
2. **Stream ends with no `done`/`error`** (network drop) — must surface a retryable error, not hang in "typing" (Task 3, 4 tests).
3. **Retry after failure must reuse the same `clientMessageId` and not duplicate the student bubble** (Task 4 test).
4. **Student opens Astra mid-exam** — pill hidden, sidebar entry disabled, panel closed (Task 8: `TutorShell` effect + `AskAstraButton` guard, verified in the Task 8 manual pass).
5. **Reply containing `$` before KaTeX has loaded, or malformed/unbalanced `$`/`**` mid-stream** — must render as escaped plain text, never inject unescaped HTML (Task 7 test on `escapeHtml`).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/tutor/types.ts` | Contract types: context, actions, messages, status, stream events |
| `src/lib/tutor/sse.ts` | Pure incremental SSE frame parser |
| `src/lib/tutor/events.ts` | Frame → typed `TutorStreamEvent` (zod-validated) |
| `src/lib/tutor/client.ts` | `streamTutorReply` async generator over `fetch` |
| `src/lib/tutor/context.ts` | `contextKey`, `threadParams` |
| `src/lib/tutor/chips.ts` | Starter chips + hint ladder |
| `src/lib/tutor/chat-state.ts` | Pure chat reducer (messages, phase, retry, hints) |
| `src/stores/tutor-store.ts` | Panel open state + page/override context |
| `src/hooks/api/use-tutor.ts` | TanStack Query: status, thread, feedback, clear |
| `src/hooks/use-tutor-chat.ts` | Glue: reducer + stream + abort + status refresh |
| `src/components/tutor/*` | Panel UI (see Tasks 7–8) |
| `scripts/fixtures/tutor-stream.txt` | Shared SSE fixture (hand to BE team) |
| `scripts/test-tutor-*.mts` | Tests |
| Modify `src/lib/subscription.ts`, `src/lib/api/endpoints.ts`, `src/lib/api/query-keys.ts` | Gate, routes, keys |
| Modify `src/app/(dashboard)/layout.tsx`, `src/components/ui/sidebar.tsx`, `src/components/ui/mobile-header.tsx` | Mount + entry points |
| Modify topic page and practice result page under `src/app/(dashboard)/classroom/[subjectSlug]/[topicSlug]/` | Lesson context + "Explain this" |

---

### Task 1: Contract types, entitlement, routes, keys

**Files:**
- Create: `src/lib/tutor/types.ts`
- Modify: `src/lib/subscription.ts` (`GATED_FEATURES`, `PAID_ENTITLEMENTS`)
- Modify: `src/lib/api/endpoints.ts` (add `tutor` block before `studyPlan`)
- Modify: `src/lib/api/query-keys.ts` (add `tutor` block after `studyPlan`)
- Modify: `scripts/test-subscription.mts` (assert new entitlement)
- Also note for BE team: mirror `aiTutor: PREMIUM` in `scholarscrib-backend/app/domain.py` (not part of this repo's change).

**Interfaces:**
- Produces: all types in `types.ts` below; `endpoints.tutor.*`; `queryKeys.tutor.*`; `can(tier, "aiTutor")`.

- [ ] **Step 1: Write the failing test**

Append to `scripts/test-subscription.mts`:

```ts
test("aiTutor is a Premium-only feature", () => {
  assert.equal(PAID_ENTITLEMENTS.aiTutor, "PREMIUM");
  assert.equal(can("PREMIUM", "aiTutor"), true);
  assert.equal(can("STANDARD", "aiTutor"), false);
  assert.equal(can("FREEMIUM", "aiTutor"), false);
});
```
(Ensure `can` is imported in that file's existing import list from `../src/lib/subscription`; add it if missing.)

- [ ] **Step 2: Run to verify it fails**

Run: `node --import tsx --test --test-force-exit scripts/test-subscription.mts`
Expected: FAIL (`PAID_ENTITLEMENTS.aiTutor` is `undefined`).

- [ ] **Step 3: Implement**

`src/lib/subscription.ts`: add `"aiTutor"` to `GATED_FEATURES` (after `"advancedAnalytics"`) and `aiTutor: "PREMIUM",` to `PAID_ENTITLEMENTS`. Do **not** add it to `BETA_OPEN_FEATURES`.

`src/lib/tutor/types.ts`:

```ts
export type TutorContext =
  | { type: "lesson"; lessonId: string }
  | { type: "question"; questionId: string; attemptId?: string }
  | { type: "topic"; subjectSlug: string; topicSlug: string }
  | { type: "general" };

export const TUTOR_ACTIONS = [
  "explain_simply",
  "example",
  "test_me",
  "hint_next",
  "reveal",
  "explain_differently",
] as const;
export type TutorAction = (typeof TUTOR_ACTIONS)[number];

export const TUTOR_MAX_CHARS = 500;

export type TutorRole = "student" | "astra";

export type TutorMessage = {
  id: string;
  role: TutorRole;
  text: string;
  rating?: "up" | "down" | null;
  suggested?: TutorAction[];
};

export type TutorStatus = {
  allowed: boolean;
  tier: string;
  remainingToday: number;
  resetsAt: string | null;
  reason?: string;
};

export type TutorThread = { threadId: string; messages: TutorMessage[] };

export type TutorErrorInfo = {
  code: string;
  message: string;
  resetsAt?: string;
};

export type TutorStreamEvent =
  | { type: "start"; messageId: string; remainingToday: number }
  | { type: "delta"; text: string }
  | { type: "suggest"; actions: TutorAction[] }
  | { type: "done"; messageId: string }
  | ({ type: "error" } & TutorErrorInfo);

export type TutorSendRequest = {
  text: string;
  action: TutorAction | null;
  clientMessageId: string;
};
```

`src/lib/api/endpoints.ts`, insert before `  studyPlan: {`:

```ts
  tutor: {
    status: "/api/tutor/status",
    currentThread: "/api/tutor/threads/current",
    thread: (threadId: string) => `/api/tutor/threads/${seg(threadId)}`,
    messages: (threadId: string) =>
      `/api/tutor/threads/${seg(threadId)}/messages`,
    feedback: (messageId: string) =>
      `/api/tutor/messages/${seg(messageId)}/feedback`,
  },
```

`src/lib/api/query-keys.ts`, insert after the `studyPlan` block:

```ts
  tutor: {
    all: ["tutor"] as const,
    status: () => [...queryKeys.tutor.all, "status"] as const,
    thread: (contextKey: string) =>
      [...queryKeys.tutor.all, "thread", contextKey] as const,
  },
```

- [ ] **Step 4: Run tests + typecheck**

Run: `node --import tsx --test --test-force-exit scripts/test-subscription.mts && npx tsc --noEmit`
Expected: PASS, no type errors. If another test enumerates `GATED_FEATURES` and fails, update its expectations (the new key is intended).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tutor/types.ts src/lib/subscription.ts src/lib/api/endpoints.ts src/lib/api/query-keys.ts scripts/test-subscription.mts
git commit -m "feat(tutor): contract types, aiTutor entitlement, routes"
```

---

### Task 2: SSE parser, event decoder, shared fixture

**Files:**
- Create: `src/lib/tutor/sse.ts`, `src/lib/tutor/events.ts`
- Create: `scripts/fixtures/tutor-stream.txt`
- Test: `scripts/test-tutor-sse.mts`

**Interfaces:**
- Produces: `createSseParser(): { push(chunk: string): SseFrame[] }`, `type SseFrame = { event: string; data: string }`, `decodeFrame(frame: SseFrame): TutorStreamEvent | null`.

- [ ] **Step 1: Write fixture and failing test**

`scripts/fixtures/tutor-stream.txt` (exactly this; blank line after each event):

```
event: start
data: {"messageId":"m_1","remainingToday":7}

event: delta
data: {"text":"Chlorophyll is the "}

event: delta
data: {"text":"green pigment. It costs ₦0 to look at a leaf."}

: heartbeat

event: suggest
data: {"actions":["example","test_me"]}

event: done
data: {"messageId":"m_1"}

```

`scripts/test-tutor-sse.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSseParser } from "../src/lib/tutor/sse";
import { decodeFrame } from "../src/lib/tutor/events";

const FIXTURE = readFileSync(
  new URL("./fixtures/tutor-stream.txt", import.meta.url),
  "utf8",
);

function parseAll(chunks: string[]) {
  const parser = createSseParser();
  return chunks.flatMap((chunk) => parser.push(chunk));
}

test("parses the fixture in one chunk", () => {
  const frames = parseAll([FIXTURE]);
  assert.deepEqual(
    frames.map((f) => f.event),
    ["start", "delta", "delta", "suggest", "done"],
  );
});

test("same result when split at every byte boundary", () => {
  const whole = parseAll([FIXTURE]);
  const split = parseAll(FIXTURE.split(""));
  assert.deepEqual(split, whole);
});

test("CRLF line endings, even split between \\r and \\n", () => {
  const frames = parseAll(["event: delta\r\ndata: {\"text\":\"a\"}\r", "\n\r\n"]);
  assert.equal(frames.length, 1);
  assert.equal(frames[0].event, "delta");
});

test("multi-line data is joined with newlines", () => {
  const frames = parseAll(["event: delta\ndata: one\ndata: two\n\n"]);
  assert.equal(frames[0].data, "one\ntwo");
});

test("an incomplete trailing frame is not emitted", () => {
  assert.equal(parseAll(['event: delta\ndata: {"text":"x"}\n']).length, 0);
});

test("decodeFrame types the fixture events", () => {
  const events = parseAll([FIXTURE]).map(decodeFrame);
  assert.deepEqual(events[0], { type: "start", messageId: "m_1", remainingToday: 7 });
  assert.deepEqual(events[1], { type: "delta", text: "Chlorophyll is the " });
  assert.deepEqual(events[3], { type: "suggest", actions: ["example", "test_me"] });
  assert.deepEqual(events[4], { type: "done", messageId: "m_1" });
});

test("unknown event names are ignored (forward compatible)", () => {
  assert.equal(decodeFrame({ event: "future", data: "{}" }), null);
});

test("a malformed known event becomes a retryable error, not a silent drop", () => {
  const event = decodeFrame({ event: "delta", data: "{not json" });
  assert.equal(event?.type, "error");
  assert.equal(event && event.type === "error" ? event.code : "", "UNAVAILABLE");
});

test("error event carries code, message and resetsAt", () => {
  const event = decodeFrame({
    event: "error",
    data: JSON.stringify({ code: "RATE_LIMITED", message: "Used up", resetsAt: "2026-10-21T00:00:00Z" }),
  });
  assert.deepEqual(event, {
    type: "error",
    code: "RATE_LIMITED",
    message: "Used up",
    resetsAt: "2026-10-21T00:00:00Z",
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --import tsx --test --test-force-exit scripts/test-tutor-sse.mts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

`src/lib/tutor/sse.ts`:

```ts
export type SseFrame = { event: string; data: string };

function parseFrame(raw: string): SseFrame | null {
  let event = "message";
  const data: string[] = [];
  for (const line of raw.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }
  return data.length === 0 ? null : { event, data: data.join("\n") };
}

/**
 * Incremental parser: feed it decoded text in whatever pieces the network
 * delivers; it returns each complete frame exactly once. A frame is complete
 * at its blank line, so a half-received frame waits in the buffer.
 */
export function createSseParser() {
  let buffer = "";
  return {
    push(chunk: string): SseFrame[] {
      // Normalised on the whole buffer, so a CRLF split across two chunks
      // still collapses once both halves are here.
      buffer = (buffer + chunk).replace(/\r\n/g, "\n");
      const frames: SseFrame[] = [];
      let end: number;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const frame = parseFrame(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        if (frame) frames.push(frame);
      }
      return frames;
    },
  };
}
```

`src/lib/tutor/events.ts`:

```ts
import { z } from "zod";
import type { SseFrame } from "./sse";
import { TUTOR_ACTIONS, type TutorStreamEvent } from "./types";

const start = z.object({ messageId: z.string(), remainingToday: z.number() });
const delta = z.object({ text: z.string() });
const suggest = z.object({ actions: z.array(z.enum(TUTOR_ACTIONS)) });
const done = z.object({ messageId: z.string() });
const failure = z.object({
  code: z.string(),
  message: z.string(),
  resetsAt: z.string().optional(),
});

const MALFORMED: TutorStreamEvent = {
  type: "error",
  code: "UNAVAILABLE",
  message: "Astra's reply got scrambled. Please try again.",
};

/** Null for event names this client does not know, so the server can add events without breaking old clients. */
export function decodeFrame(frame: SseFrame): TutorStreamEvent | null {
  const known = ["start", "delta", "suggest", "done", "error"];
  if (!known.includes(frame.event)) return null;

  let json: unknown;
  try {
    json = JSON.parse(frame.data);
  } catch {
    return MALFORMED;
  }

  switch (frame.event) {
    case "start": {
      const r = start.safeParse(json);
      return r.success ? { type: "start", ...r.data } : MALFORMED;
    }
    case "delta": {
      const r = delta.safeParse(json);
      return r.success ? { type: "delta", text: r.data.text } : MALFORMED;
    }
    case "suggest": {
      const r = suggest.safeParse(json);
      return r.success ? { type: "suggest", actions: r.data.actions } : MALFORMED;
    }
    case "done": {
      const r = done.safeParse(json);
      return r.success ? { type: "done", messageId: r.data.messageId } : MALFORMED;
    }
    default: {
      const r = failure.safeParse(json);
      return r.success ? { type: "error", ...r.data } : MALFORMED;
    }
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --import tsx --test --test-force-exit scripts/test-tutor-sse.mts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tutor/sse.ts src/lib/tutor/events.ts scripts/fixtures/tutor-stream.txt scripts/test-tutor-sse.mts
git commit -m "feat(tutor): SSE parser, event decoder, shared fixture"
```

---

### Task 3: Streaming client

**Files:**
- Create: `src/lib/tutor/client.ts`
- Test: `scripts/test-tutor-client.mts`

**Interfaces:**
- Consumes: `createSseParser`, `decodeFrame`, `endpoints.tutor.messages`, `getAccessToken`, `API_URL`, `ApiError`.
- Produces:

```ts
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
  token?: string | null; // undefined → read from cookie
  baseUrl?: string;
};
export function errorCodeForStatus(status: number): string;
export function streamTutorReply(args: StreamArgs, opts?: StreamOptions): AsyncGenerator<TutorStreamEvent>;
```
Behaviour: non-OK (other than 401) **yields one `error` event and returns**; 401 **throws `ApiError`** (caller signs the student out); a stream that ends without `done`/`error` yields `UNAVAILABLE`.

- [ ] **Step 1: Write the failing test**

`scripts/test-tutor-client.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { errorCodeForStatus, streamTutorReply } from "../src/lib/tutor/client";
import { ApiError } from "../src/lib/api/errors";
import type { TutorStreamEvent } from "../src/lib/tutor/types";

const ARGS = {
  threadId: "t1",
  text: "hi",
  action: null,
  context: { type: "general" } as const,
  clientMessageId: "c1",
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
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

async function collect(gen: AsyncGenerator<TutorStreamEvent>) {
  const out: TutorStreamEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

const FRAMES =
  'event: start\ndata: {"messageId":"m","remainingToday":3}\n\n' +
  'event: delta\ndata: {"text":"₦500"}\n\n' +
  'event: done\ndata: {"messageId":"m"}\n\n';

test("decodes a multibyte character split across network chunks", async () => {
  const bytes = new TextEncoder().encode(FRAMES);
  const mid = bytes.indexOf(0xe2) + 1; // inside the 3-byte "₦"
  const events = await collect(
    streamTutorReply(ARGS, { token: "t", fetchImpl: async () => streamOf(FRAMES, [mid]) }),
  );
  assert.deepEqual(events.map((e) => e.type), ["start", "delta", "done"]);
  assert.equal(events[1].type === "delta" && events[1].text, "₦500");
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
  assert.equal(url, "http://api.test/api/tutor/threads/t1/messages");
  const headers = init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer tok");
  assert.equal(headers.Accept, "text/event-stream");
  assert.deepEqual(JSON.parse(String(init.body)), {
    text: "hi",
    action: null,
    context: { type: "general" },
    clientMessageId: "c1",
  });
});

test("a stream that ends without done yields a retryable error", async () => {
  const cut = 'event: start\ndata: {"messageId":"m","remainingToday":3}\n\n';
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
          JSON.stringify({ error: "Used up", code: "RATE_LIMITED", resetsAt: "2026-10-21T00:00:00Z" }),
          { status: 429 },
        ),
    }),
  );
  assert.deepEqual(events, [
    { type: "error", code: "RATE_LIMITED", message: "Used up", resetsAt: "2026-10-21T00:00:00Z" },
  ]);
});

test("401 throws ApiError so the caller can sign out", async () => {
  await assert.rejects(
    collect(
      streamTutorReply(ARGS, {
        token: "t",
        fetchImpl: async () => new Response(JSON.stringify({ error: "no" }), { status: 401 }),
      }),
    ),
    (err: unknown) => err instanceof ApiError && err.isAuthFailure,
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --import tsx --test --test-force-exit scripts/test-tutor-client.mts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/lib/tutor/client.ts`:

```ts
import { getAccessToken } from "@/lib/api/client";
import { API_URL } from "@/lib/api/config";
import { endpoints } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { ApiErrorBody } from "@/lib/api/types";
import { decodeFrame } from "./events";
import { createSseParser } from "./sse";
import type {
  TutorAction,
  TutorContext,
  TutorStreamEvent,
} from "./types";

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

export function errorCodeForStatus(status: number): string {
  if (status === 402 || status === 403) return "TIER_REQUIRED";
  if (status === 404) return "CONTEXT_NOT_FOUND";
  if (status === 429) return "RATE_LIMITED";
  return "UNAVAILABLE";
}

async function readErrorBody(res: Response): Promise<ApiErrorBody & { resetsAt?: string }> {
  try {
    const body: unknown = await res.json();
    return body && typeof body === "object" ? (body as ApiErrorBody) : {};
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
      resetsAt: (body as { resetsAt?: string }).resetsAt,
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --import tsx --test --test-force-exit scripts/test-tutor-client.mts`
Expected: PASS (6 tests). If `getAccessToken` import fails under node because of `document` access, it is already guarded by `typeof document` and tests pass `token`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tutor/client.ts scripts/test-tutor-client.mts
git commit -m "feat(tutor): fetch-based SSE stream client"
```

---

### Task 4: Context keys, chips + hint ladder, chat reducer

**Files:**
- Create: `src/lib/tutor/context.ts`, `src/lib/tutor/chips.ts`, `src/lib/tutor/chat-state.ts`
- Test: `scripts/test-tutor-chat.mts`

**Interfaces:**
- Produces:

```ts
// context.ts
export function contextKey(c: TutorContext): string;
export function threadParams(c: TutorContext): { type: TutorContext["type"]; id: string };
// chips.ts
export type Chip = { label: string; action: TutorAction | null; text: string };
export function startersFor(c: TutorContext): Chip[];
export function ladderFor(c: TutorContext, hintsUsed: number): Chip[] | null; // null = not a hint-ladder context
// chat-state.ts
export type ChatPhase = "idle" | "streaming" | "error";
export type ChatState = {
  messages: TutorMessage[];
  phase: ChatPhase;
  error: TutorErrorInfo | null;
  remainingToday: number | null;
  hintsUsed: number;
  lastRequest: TutorSendRequest | null;
};
export type ChatAction =
  | { type: "send"; request: TutorSendRequest }
  | { type: "event"; event: TutorStreamEvent }
  | { type: "failed"; error: TutorErrorInfo }
  | { type: "stopped" }
  | { type: "rate"; messageId: string; rating: "up" | "down" };
export function initialChatState(messages: TutorMessage[]): ChatState;
export function chatReducer(state: ChatState, action: ChatAction): ChatState;
```

- [ ] **Step 1: Write the failing test**

`scripts/test-tutor-chat.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { contextKey, threadParams } from "../src/lib/tutor/context";
import { ladderFor, startersFor } from "../src/lib/tutor/chips";
import { chatReducer, initialChatState } from "../src/lib/tutor/chat-state";
import type { TutorSendRequest, TutorStreamEvent } from "../src/lib/tutor/types";

const REQ: TutorSendRequest = { text: "What is chlorophyll?", action: null, clientMessageId: "c1" };
const run = (events: TutorStreamEvent[], start = initialChatState([])) =>
  events.reduce((s, event) => chatReducer(s, { type: "event", event }), start);

test("contextKey is stable and distinct per context", () => {
  assert.equal(contextKey({ type: "general" }), "general");
  assert.equal(contextKey({ type: "lesson", lessonId: "L1" }), "lesson:L1");
  assert.equal(contextKey({ type: "question", questionId: "Q1" }), "question:Q1");
  assert.equal(contextKey({ type: "topic", subjectSlug: "bio", topicSlug: "cells" }), "topic:bio/cells");
  assert.deepEqual(threadParams({ type: "topic", subjectSlug: "bio", topicSlug: "cells" }), { type: "topic", id: "bio/cells" });
  assert.deepEqual(threadParams({ type: "general" }), { type: "general", id: "" });
});

test("unanswered question uses the hint ladder; answered one does not", () => {
  const open = { type: "question", questionId: "Q1" } as const;
  assert.deepEqual(ladderFor(open, 0)?.map((c) => c.action), ["hint_next"]);
  assert.deepEqual(ladderFor(open, 1)?.map((c) => c.action), ["hint_next", "reveal"]);
  assert.deepEqual(ladderFor(open, 2)?.map((c) => c.action), ["reveal"]);
  assert.equal(ladderFor({ type: "question", questionId: "Q1", attemptId: "A1" }, 0), null);
  assert.equal(ladderFor({ type: "lesson", lessonId: "L" }, 0), null);
});

test("starters differ by context and always have text to send", () => {
  for (const ctx of [
    { type: "lesson", lessonId: "L" },
    { type: "question", questionId: "Q", attemptId: "A" },
    { type: "general" },
  ] as const) {
    const chips = startersFor(ctx);
    assert.ok(chips.length >= 3);
    assert.ok(chips.every((c) => c.text.length > 0 && c.text.length <= 500));
  }
});

test("send appends student bubble + placeholder and starts streaming", () => {
  const s = chatReducer(initialChatState([]), { type: "send", request: REQ });
  assert.equal(s.phase, "streaming");
  assert.deepEqual(s.messages.map((m) => m.role), ["student", "astra"]);
  assert.equal(s.messages[1].text, "");
});

test("stream events build the reply and finish", () => {
  const s = run(
    [
      { type: "start", messageId: "m1", remainingToday: 4 },
      { type: "delta", text: "Chloro" },
      { type: "delta", text: "phyll" },
      { type: "suggest", actions: ["example"] },
      { type: "done", messageId: "m1" },
    ],
    chatReducer(initialChatState([]), { type: "send", request: REQ }),
  );
  assert.equal(s.phase, "idle");
  assert.equal(s.remainingToday, 4);
  const reply = s.messages[1];
  assert.equal(reply.id, "m1");
  assert.equal(reply.text, "Chlorophyll");
  assert.deepEqual(reply.suggested, ["example"]);
});

test("error before any text removes the empty placeholder", () => {
  const s = run(
    [{ type: "error", code: "UNAVAILABLE", message: "down" }],
    chatReducer(initialChatState([]), { type: "send", request: REQ }),
  );
  assert.equal(s.phase, "error");
  assert.equal(s.messages.length, 1);
  assert.equal(s.error?.code, "UNAVAILABLE");
});

test("error after partial text keeps what Astra already said", () => {
  const s = run(
    [
      { type: "start", messageId: "m1", remainingToday: 4 },
      { type: "delta", text: "Half an ans" },
      { type: "error", code: "UNAVAILABLE", message: "dropped" },
    ],
    chatReducer(initialChatState([]), { type: "send", request: REQ }),
  );
  assert.equal(s.messages[1].text, "Half an ans");
  assert.equal(s.phase, "error");
});

test("retry with the same clientMessageId does not duplicate the student bubble", () => {
  let s = chatReducer(initialChatState([]), { type: "send", request: REQ });
  s = run([{ type: "error", code: "UNAVAILABLE", message: "down" }], s);
  s = chatReducer(s, { type: "send", request: REQ });
  assert.equal(s.messages.filter((m) => m.role === "student").length, 1);
  assert.equal(s.messages.filter((m) => m.role === "astra").length, 1);
  assert.equal(s.phase, "streaming");
  assert.equal(s.error, null);
});

test("hint_next requests count toward the ladder; retries of one do not double count", () => {
  const hint: TutorSendRequest = { text: "Give me a hint", action: "hint_next", clientMessageId: "h1" };
  let s = chatReducer(initialChatState([]), { type: "send", request: hint });
  s = run([{ type: "error", code: "UNAVAILABLE", message: "x" }], s);
  s = chatReducer(s, { type: "send", request: hint });
  assert.equal(s.hintsUsed, 1);
});

test("stopped keeps partial text and returns to idle; empty placeholder is dropped", () => {
  let s = run(
    [{ type: "start", messageId: "m1", remainingToday: 4 }, { type: "delta", text: "Part" }],
    chatReducer(initialChatState([]), { type: "send", request: REQ }),
  );
  s = chatReducer(s, { type: "stopped" });
  assert.equal(s.phase, "idle");
  assert.equal(s.messages[1].text, "Part");

  const empty = chatReducer(chatReducer(initialChatState([]), { type: "send", request: REQ }), { type: "stopped" });
  assert.equal(empty.messages.length, 1);
});

test("rating sets the thumb on one message", () => {
  const s = chatReducer(
    initialChatState([{ id: "m1", role: "astra", text: "hi" }]),
    { type: "rate", messageId: "m1", rating: "up" },
  );
  assert.equal(s.messages[0].rating, "up");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --import tsx --test --test-force-exit scripts/test-tutor-chat.mts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

`src/lib/tutor/context.ts`:

```ts
import type { TutorContext } from "./types";

export function threadParams(c: TutorContext): { type: TutorContext["type"]; id: string } {
  switch (c.type) {
    case "lesson":
      return { type: "lesson", id: c.lessonId };
    case "question":
      return { type: "question", id: c.questionId };
    case "topic":
      return { type: "topic", id: `${c.subjectSlug}/${c.topicSlug}` };
    default:
      return { type: "general", id: "" };
  }
}

/** One thread per key: `(student, context)` on the BE, this string in the cache. */
export function contextKey(c: TutorContext): string {
  const { type, id } = threadParams(c);
  return id ? `${type}:${id}` : type;
}
```
(An `attemptId` is deliberately not part of the key: the thread is per question; the attempt only tells the BE the question is answered.)

`src/lib/tutor/chips.ts`:

```ts
import type { TutorAction, TutorContext } from "./types";

export type Chip = { label: string; action: TutorAction | null; text: string };

const chip = (label: string, action: TutorAction | null = null, text = label): Chip => ({
  label,
  action,
  text,
});

export function startersFor(c: TutorContext): Chip[] {
  switch (c.type) {
    case "lesson":
    case "topic":
      return [
        chip("Explain simply", "explain_simply", "Explain this simply"),
        chip("Give an example", "example", "Give me an example"),
        chip("Test me", "test_me", "Test me on this"),
        chip("Why does this matter?"),
      ];
    case "question":
      return [
        chip("Explain the answer", null, "Explain the answer to this question"),
        chip("Show me the steps", null, "Show me the steps"),
        chip("Give me a similar one", null, "Give me a similar question"),
      ];
    default:
      return [
        chip("Help me study", null, "Help me plan my study"),
        chip("Explain a topic", null, "Explain a topic to me"),
        chip("Quiz me", "test_me", "Quiz me"),
      ];
  }
}

const HINT = chip("Give me a hint", "hint_next");
const ANOTHER = chip("Another hint", "hint_next");
const REVEAL = chip("Walk me through it", "reveal");

/**
 * Hint ladder for a question the student has not answered: hint → hint →
 * walkthrough. Null means "not a ladder context", so callers fall back to
 * `startersFor`.
 */
export function ladderFor(c: TutorContext, hintsUsed: number): Chip[] | null {
  if (c.type !== "question" || c.attemptId) return null;
  if (hintsUsed <= 0) return [HINT];
  if (hintsUsed === 1) return [ANOTHER, REVEAL];
  return [REVEAL];
}
```

`src/lib/tutor/chat-state.ts`:

```ts
import type {
  TutorErrorInfo,
  TutorMessage,
  TutorSendRequest,
  TutorStreamEvent,
} from "./types";

export type ChatPhase = "idle" | "streaming" | "error";

export type ChatState = {
  messages: TutorMessage[];
  phase: ChatPhase;
  error: TutorErrorInfo | null;
  remainingToday: number | null;
  hintsUsed: number;
  lastRequest: TutorSendRequest | null;
};

export type ChatAction =
  | { type: "send"; request: TutorSendRequest }
  | { type: "event"; event: TutorStreamEvent }
  | { type: "failed"; error: TutorErrorInfo }
  | { type: "stopped" }
  | { type: "rate"; messageId: string; rating: "up" | "down" };

export function initialChatState(messages: TutorMessage[]): ChatState {
  return {
    messages,
    phase: "idle",
    error: null,
    remainingToday: null,
    hintsUsed: 0,
    lastRequest: null,
  };
}

const pendingId = (clientMessageId: string) => `pending-${clientMessageId}`;

/** Drops a trailing Astra message that never received any text. */
function dropEmptyReply(messages: TutorMessage[]): TutorMessage[] {
  const last = messages[messages.length - 1];
  return last && last.role === "astra" && last.text === "" ? messages.slice(0, -1) : messages;
}

function mapLastReply(
  messages: TutorMessage[],
  fn: (m: TutorMessage) => TutorMessage,
): TutorMessage[] {
  const i = messages.length - 1;
  if (i < 0 || messages[i].role !== "astra") return messages;
  return [...messages.slice(0, i), fn(messages[i]), ...messages.slice(i + 1)];
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "send": {
      const { request } = action;
      // A retry reuses its clientMessageId (the BE de-duplicates quota on it),
      // so its bubble is already on screen and must not be added twice.
      const isRetry = state.messages.some((m) => m.id === request.clientMessageId);
      const base = dropEmptyReply(state.messages);
      const messages = [
        ...(isRetry
          ? base
          : [...base, { id: request.clientMessageId, role: "student" as const, text: request.text }]),
        { id: pendingId(request.clientMessageId), role: "astra" as const, text: "" },
      ];
      return {
        ...state,
        messages,
        phase: "streaming",
        error: null,
        lastRequest: request,
        hintsUsed:
          request.action === "hint_next" && !isRetry ? state.hintsUsed + 1 : state.hintsUsed,
      };
    }
    case "event": {
      const { event } = action;
      switch (event.type) {
        case "start":
          return {
            ...state,
            remainingToday: event.remainingToday,
            messages: mapLastReply(state.messages, (m) => ({ ...m, id: event.messageId })),
          };
        case "delta":
          return {
            ...state,
            messages: mapLastReply(state.messages, (m) => ({ ...m, text: m.text + event.text })),
          };
        case "suggest":
          return {
            ...state,
            messages: mapLastReply(state.messages, (m) => ({ ...m, suggested: event.actions })),
          };
        case "done":
          return { ...state, phase: "idle" };
        case "error":
          return chatReducer(state, {
            type: "failed",
            error: { code: event.code, message: event.message, resetsAt: event.resetsAt },
          });
      }
      return state;
    }
    case "failed":
      return {
        ...state,
        phase: "error",
        error: action.error,
        messages: dropEmptyReply(state.messages),
      };
    case "stopped":
      return { ...state, phase: "idle", messages: dropEmptyReply(state.messages) };
    case "rate":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, rating: action.rating } : m,
        ),
      };
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --import tsx --test --test-force-exit scripts/test-tutor-chat.mts && npx tsc --noEmit`
Expected: PASS (10 tests), no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tutor/context.ts src/lib/tutor/chips.ts src/lib/tutor/chat-state.ts scripts/test-tutor-chat.mts
git commit -m "feat(tutor): context keys, chips, hint ladder, chat reducer"
```

---

### Task 5: Tutor store

**Files:**
- Create: `src/stores/tutor-store.ts`
- Modify: `src/stores/README.md` (one line: tutor store, server never writes)
- Test: `scripts/test-tutor-store.mts`

**Interfaces:**
- Consumes: `TutorContext`.
- Produces:

```ts
export type TutorEntry = { context: TutorContext; label?: string };
type TutorStore = {
  open: boolean;
  pageEntry: TutorEntry | null;     // registered by the page being viewed
  overrideEntry: TutorEntry | null; // "Explain this" on a specific item, or detached
  openPanel: (entry?: TutorEntry) => void;
  closePanel: () => void;
  detach: () => void;               // chip ✕ → general chat
  setPageEntry: (entry: TutorEntry | null) => void;
};
export const useTutorStore;
export function selectActiveEntry(s: Pick<TutorStore, "overrideEntry" | "pageEntry">): TutorEntry;
```

- [ ] **Step 1: Write the failing test**

`scripts/test-tutor-store.mts`:

```ts
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { selectActiveEntry, useTutorStore } from "../src/stores/tutor-store";

const LESSON = { context: { type: "lesson", lessonId: "L1" } as const, label: "Cells" };
const QUESTION = { context: { type: "question", questionId: "Q1" } as const };

beforeEach(() => {
  useTutorStore.setState({ open: false, pageEntry: null, overrideEntry: null });
});

test("with nothing registered the active context is general", () => {
  assert.deepEqual(selectActiveEntry(useTutorStore.getState()).context, { type: "general" });
});

test("opening uses the page's context", () => {
  useTutorStore.getState().setPageEntry(LESSON);
  useTutorStore.getState().openPanel();
  const s = useTutorStore.getState();
  assert.equal(s.open, true);
  assert.deepEqual(selectActiveEntry(s), LESSON);
});

test("an explicit entry overrides the page and is forgotten on close", () => {
  useTutorStore.getState().setPageEntry(LESSON);
  useTutorStore.getState().openPanel(QUESTION);
  assert.deepEqual(selectActiveEntry(useTutorStore.getState()), QUESTION);
  useTutorStore.getState().closePanel();
  assert.deepEqual(selectActiveEntry(useTutorStore.getState()), LESSON);
});

test("detach switches to general chat without losing the page entry", () => {
  useTutorStore.getState().setPageEntry(LESSON);
  useTutorStore.getState().openPanel();
  useTutorStore.getState().detach();
  assert.deepEqual(selectActiveEntry(useTutorStore.getState()).context, { type: "general" });
  assert.deepEqual(useTutorStore.getState().pageEntry, LESSON);
});

test("clearing the page entry (navigating away) falls back to general", () => {
  useTutorStore.getState().setPageEntry(LESSON);
  useTutorStore.getState().setPageEntry(null);
  assert.deepEqual(selectActiveEntry(useTutorStore.getState()).context, { type: "general" });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --import tsx --test --test-force-exit scripts/test-tutor-store.mts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/stores/tutor-store.ts`:

```ts
"use client";

import { create } from "zustand";
import type { TutorContext } from "@/lib/tutor/types";

// Panel state shared by the layout (which mounts the panel) and the entry
// points scattered through pages. The server always renders the initial state
// -- nothing on the server may write to this store (see ./README.md).

export type TutorEntry = { context: TutorContext; label?: string };

type TutorStore = {
  open: boolean;
  /** Registered by the page being viewed (e.g. the lesson). */
  pageEntry: TutorEntry | null;
  /** "Explain this" on a specific item, or a detached (general) chat. */
  overrideEntry: TutorEntry | null;
  openPanel: (entry?: TutorEntry) => void;
  closePanel: () => void;
  detach: () => void;
  setPageEntry: (entry: TutorEntry | null) => void;
};

const GENERAL: TutorEntry = { context: { type: "general" } };

export const useTutorStore = create<TutorStore>()((set) => ({
  open: false,
  pageEntry: null,
  overrideEntry: null,
  openPanel: (entry) => set({ open: true, overrideEntry: entry ?? null }),
  closePanel: () => set({ open: false, overrideEntry: null }),
  detach: () => set({ overrideEntry: GENERAL }),
  setPageEntry: (entry) => set({ pageEntry: entry }),
}));

export function selectActiveEntry(
  s: Pick<TutorStore, "overrideEntry" | "pageEntry">,
): TutorEntry {
  return s.overrideEntry ?? s.pageEntry ?? GENERAL;
}
```

`src/stores/README.md`: add a bullet naming `tutor-store.ts` alongside `exam-store.ts` with the same "server never writes" rule (read the file first and match its format).

- [ ] **Step 4: Run to verify it passes**

Run: `node --import tsx --test --test-force-exit scripts/test-tutor-store.mts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stores/tutor-store.ts src/stores/README.md scripts/test-tutor-store.mts
git commit -m "feat(tutor): panel store with page and override context"
```

---

### Task 6: Query hooks and chat hook

**Files:**
- Create: `src/hooks/api/use-tutor.ts`, `src/hooks/use-tutor-chat.ts`

**Interfaces:**
- Consumes: `request`, `endpoints.tutor`, `queryKeys.tutor`, `threadParams`, `contextKey`, `chatReducer`, `streamTutorReply`, `isApiError`, `clearStudentToken`.
- Produces:

```ts
export function useTutorStatus(enabled: boolean): UseQueryResult<TutorStatus>;
export function useTutorThread(context: TutorContext, enabled: boolean): UseQueryResult<TutorThread>;
export function useTutorFeedback(): UseMutationResult<unknown, Error, { messageId: string; rating: "up" | "down" }>;
export function useClearTutorThread(): UseMutationResult<unknown, Error, { threadId: string; contextKey: string }>;
export function useTutorChat(args: { threadId: string; context: TutorContext; initialMessages: TutorMessage[] }): {
  state: ChatState;
  send: (req: { text: string; action: TutorAction | null }) => void;
  retry: () => void;
  stop: () => void;
  rate: (messageId: string, rating: "up" | "down") => void;
};
```

These are thin glue over tested units; verified by type-check, lint and the manual pass in Task 9.

- [ ] **Step 1: Write `src/hooks/api/use-tutor.ts`**

```ts
"use client";

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import { contextKey, threadParams } from "@/lib/tutor/context";
import type { TutorContext, TutorStatus, TutorThread } from "@/lib/tutor/types";

export function tutorStatusQuery() {
  return queryOptions({
    queryKey: queryKeys.tutor.status(),
    queryFn: () => request<TutorStatus>({ method: "GET", url: endpoints.tutor.status }),
    staleTime: 30_000,
  });
}

export function useTutorStatus(enabled: boolean) {
  return useQuery({ ...tutorStatusQuery(), enabled });
}

export function useTutorThread(context: TutorContext, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.tutor.thread(contextKey(context)),
    queryFn: () =>
      request<TutorThread>({
        method: "GET",
        url: endpoints.tutor.currentThread,
        params: threadParams(context),
      }),
    enabled,
    // A thread is only read when the panel opens for a context; the chat hook
    // owns it while the panel is open.
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  });
}

export function useTutorFeedback() {
  return useMutation({
    mutationFn: (input: { messageId: string; rating: "up" | "down" }) =>
      request({
        method: "POST",
        url: endpoints.tutor.feedback(input.messageId),
        data: { rating: input.rating },
      }),
  });
}

export function useClearTutorThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { threadId: string; contextKey: string }) =>
      request({ method: "DELETE", url: endpoints.tutor.thread(input.threadId) }),
    onSuccess: (_data, input) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.tutor.thread(input.contextKey) }),
  });
}
```

- [ ] **Step 2: Write `src/hooks/use-tutor-chat.ts`**

```ts
"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { clearStudentToken } from "@/lib/api/client";
import { isApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import { chatReducer, initialChatState } from "@/lib/tutor/chat-state";
import { streamTutorReply } from "@/lib/tutor/client";
import type {
  TutorAction,
  TutorContext,
  TutorMessage,
  TutorSendRequest,
} from "@/lib/tutor/types";
import { useTutorFeedback } from "@/hooks/api/use-tutor";

/**
 * Owns one open conversation. Mount it only once the thread has loaded and
 * `key` the parent by thread, so the reducer starts from the server's messages
 * and is replaced -- never patched -- when the context changes.
 */
export function useTutorChat({
  threadId,
  context,
  initialMessages,
}: {
  threadId: string;
  context: TutorContext;
  initialMessages: TutorMessage[];
}) {
  const [state, dispatch] = useReducer(chatReducer, initialMessages, initialChatState);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();
  const feedback = useTutorFeedback();

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(
    async (request: TutorSendRequest) => {
      dispatch({ type: "send", request });
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        for await (const event of streamTutorReply(
          { threadId, context, ...request },
          { signal: controller.signal },
        )) {
          dispatch({ type: "event", event });
        }
      } catch (err) {
        if (controller.signal.aborted) {
          dispatch({ type: "stopped" });
        } else if (isApiError(err) && err.isAuthFailure) {
          clearStudentToken();
          window.location.assign("/login?reason=session");
        } else {
          dispatch({
            type: "failed",
            error: {
              code: "UNAVAILABLE",
              message: "Couldn't reach Astra. Check your connection and try again.",
            },
          });
        }
      } finally {
        queryClient.invalidateQueries({ queryKey: queryKeys.tutor.status() });
      }
    },
    [threadId, context, queryClient],
  );

  const send = useCallback(
    (req: { text: string; action: TutorAction | null }) => {
      void run({ ...req, clientMessageId: crypto.randomUUID() });
    },
    [run],
  );

  const retry = useCallback(() => {
    if (state.lastRequest) void run(state.lastRequest);
  }, [run, state.lastRequest]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const rate = useCallback(
    (messageId: string, rating: "up" | "down") => {
      dispatch({ type: "rate", messageId, rating });
      feedback.mutate({ messageId, rating });
    },
    [feedback],
  );

  return { state, send, retry, stop, rate };
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. (`react-hooks/exhaustive-deps` is satisfied by the deps above.)

- [ ] **Step 4: Commit**

```bash
git add src/hooks/api/use-tutor.ts src/hooks/use-tutor-chat.ts
git commit -m "feat(tutor): query hooks and chat hook"
```

---

### Task 7: Message UI (markdown, bubbles, chips, composer)

**Files:**
- Create: `src/components/tutor/escape-html.ts`, `tutor-markdown.tsx`, `astra-avatar.tsx`, `tutor-message.tsx`, `tutor-chips.tsx`, `tutor-composer.tsx`
- Test: `scripts/test-tutor-escape.mts`

**Interfaces:**
- Consumes: `MarkdownBase`/`RenderMath` from `@/components/lesson/markdown-base`, `Chip`, `TutorMessage`, `TUTOR_MAX_CHARS`.
- Produces:

```ts
export function escapeHtml(text: string): string;
export function TutorMarkdown(props: { content: string }): JSX.Element;
export function AstraAvatar(props: { className?: string }): JSX.Element;
export function TutorMessageView(props: {
  message: TutorMessage;
  streaming: boolean;                      // true for the last Astra message while phase === "streaming"
  isLast: boolean;
  onRate: (id: string, r: "up" | "down") => void;
  onAction: (action: TutorAction, label: string) => void;
}): JSX.Element;
export function TutorChips(props: { chips: Chip[]; onPick: (chip: Chip) => void; disabled?: boolean }): JSX.Element;
export function TutorComposer(props: {
  streaming: boolean;
  disabled?: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}): JSX.Element;
```

- [ ] **Step 1: Failing test for the escape fallback (Review Focus #5)**

`scripts/test-tutor-escape.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "../src/components/tutor/escape-html";

test("escapes markup so pre-KaTeX math fallback cannot inject HTML", () => {
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)">&'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;",
  );
});

test("leaves ordinary maths source untouched", () => {
  assert.equal(escapeHtml("x^2 + 3 = 7"), "x^2 + 3 = 7");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --import tsx --test --test-force-exit scripts/test-tutor-escape.mts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/components/tutor/escape-html.ts`:

```ts
// `MarkdownBase` injects whatever `renderMath` returns as HTML. Until KaTeX has
// loaded, the fallback returns the formula's source, so it must be escaped.
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
```

`src/components/tutor/tutor-markdown.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { MarkdownBase, type RenderMath } from "@/components/lesson/markdown-base";
import { escapeHtml } from "./escape-html";

const plain: RenderMath = (tex) => escapeHtml(tex);

/**
 * Reply text, with KaTeX pulled in only when a reply actually contains maths.
 * Until it arrives, formulas show as escaped source, so a streaming reply is
 * readable at every moment and never injects markup.
 */
export function TutorMarkdown({ content }: { content: string }) {
  const [renderMath, setRenderMath] = useState<RenderMath>(() => plain);
  const hasMath = content.includes("$");

  useEffect(() => {
    if (!hasMath) return;
    let live = true;
    void import("@/lib/latex").then((m) => {
      if (live) setRenderMath(() => m.renderLatex);
    });
    return () => {
      live = false;
    };
  }, [hasMath]);

  return <MarkdownBase content={content} renderMath={renderMath} />;
}
```
Verify `MarkdownBase`'s prop names by reading `markdown-base.tsx` exports; adjust if they differ from `content` / `renderMath`.

`src/components/tutor/astra-avatar.tsx`:

```tsx
import { LuStar } from "react-icons/lu";
import { cn } from "@/lib/utils";

export function AstraAvatar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary",
        className,
      )}
    >
      <LuStar className="h-4 w-4" />
    </span>
  );
}
```

`src/components/tutor/tutor-message.tsx`:

```tsx
"use client";

import { LuThumbsDown, LuThumbsUp } from "react-icons/lu";
import { cn } from "@/lib/utils";
import type { TutorAction, TutorMessage } from "@/lib/tutor/types";
import { AstraAvatar } from "./astra-avatar";
import { TutorMarkdown } from "./tutor-markdown";

const SUGGESTION_LABELS: Record<TutorAction, string> = {
  explain_simply: "Explain simply",
  example: "Give an example",
  test_me: "Test me",
  hint_next: "Another hint",
  reveal: "Walk me through it",
  explain_differently: "Explain differently",
};

export function TutorMessageView({
  message,
  streaming,
  isLast,
  onRate,
  onAction,
}: {
  message: TutorMessage;
  streaming: boolean;
  isLast: boolean;
  onRate: (id: string, rating: "up" | "down") => void;
  onAction: (action: TutorAction, label: string) => void;
}) {
  if (message.role === "student") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground">
          {message.text}
        </p>
      </div>
    );
  }

  const waiting = streaming && message.text === "";
  const finished = !streaming && message.text !== "";

  return (
    <div className="flex items-start gap-2.5">
      <AstraAvatar />
      <div className="min-w-0 max-w-[85%]">
        <div className="rounded-2xl rounded-tl-md bg-secondary px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
          {waiting ? (
            <span className="flex items-center gap-1 py-1" aria-label="Astra is typing">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-muted motion-safe:animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          ) : (
            <TutorMarkdown content={message.text} />
          )}
        </div>

        {finished && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {(["up", "down"] as const).map((rating) => {
              const Icon = rating === "up" ? LuThumbsUp : LuThumbsDown;
              const active = message.rating === rating;
              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => onRate(message.id, rating)}
                  aria-label={rating === "up" ? "Helpful" : "Not helpful"}
                  aria-pressed={active}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-secondary hover:text-foreground",
                    active && "bg-primary-soft text-primary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
            {isLast && (
              <>
                <button
                  type="button"
                  onClick={() => onAction("explain_differently", "Explain differently")}
                  className="min-h-8 rounded-full border border-border px-3 text-xs font-semibold text-muted transition-colors hover:text-foreground"
                >
                  Explain differently
                </button>
                {message.suggested?.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => onAction(action, SUGGESTION_LABELS[action])}
                    className="min-h-8 rounded-full border border-border px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft"
                  >
                    {SUGGESTION_LABELS[action]}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```
(Touch targets: the 32px thumbs sit in a row with 6px gaps; the pills are `min-h-8`. If design review wants 44px, raise to `h-11`/`min-h-11` — the composer and primary buttons below already use 44px.)

`src/components/tutor/tutor-chips.tsx`:

```tsx
"use client";

import type { Chip } from "@/lib/tutor/chips";

export function TutorChips({
  chips,
  onPick,
  disabled,
}: {
  chips: Chip[];
  onPick: (chip: Chip) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          disabled={disabled}
          onClick={() => onPick(chip)}
          className="min-h-11 rounded-full border border-border bg-card px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft disabled:opacity-50"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
```

`src/components/tutor/tutor-composer.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { LuArrowUp, LuSquare } from "react-icons/lu";
import { TUTOR_MAX_CHARS } from "@/lib/tutor/types";
import { cn } from "@/lib/utils";

export function TutorComposer({
  streaming,
  disabled,
  onSend,
  onStop,
}: {
  streaming: boolean;
  disabled?: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();
  const canSend = !disabled && !streaming && trimmed.length > 0;

  function submit() {
    if (!canSend) return;
    onSend(trimmed);
    setText("");
    if (ref.current) ref.current.style.height = "auto";
  }

  function grow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`; // ~4 lines
  }

  return (
    <div className="border-t border-border bg-card px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={text}
          rows={1}
          maxLength={TUTOR_MAX_CHARS}
          disabled={disabled}
          placeholder="Ask Astra anything…"
          aria-label="Message Astra"
          onChange={(e) => {
            setText(e.target.value);
            grow(e.target);
          }}
          onKeyDown={(e) => {
            // Phones use Enter for a new line; a hardware keyboard sends.
            const touch = window.matchMedia("(pointer: coarse)").matches;
            if (e.key === "Enter" && !e.shiftKey && !touch) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-background px-3.5 py-2.5 text-base text-foreground placeholder:text-muted focus:border-primary focus:outline-none sm:text-sm"
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            <LuSquare className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send"
            className={cn(
              "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity",
              !canSend && "opacity-40",
            )}
          >
            <LuArrowUp className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-muted">
        <span>Astra can make mistakes. Check important facts.</span>
        {text.length >= TUTOR_MAX_CHARS - 80 && (
          <span aria-live="polite">
            {text.length}/{TUTOR_MAX_CHARS}
          </span>
        )}
      </div>
    </div>
  );
}
```
(`text-base` on mobile stops iOS zooming the page when the field is focused.)

- [ ] **Step 4: Run tests, type-check, lint**

Run: `node --import tsx --test --test-force-exit scripts/test-tutor-escape.mts && npx tsc --noEmit && npm run lint`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/tutor scripts/test-tutor-escape.mts
git commit -m "feat(tutor): message bubbles, markdown, chips, composer"
```

---

### Task 8: Panel, shell, locked state, entry points

**Files:**
- Create: `src/components/tutor/tutor-conversation.tsx`, `tutor-locked.tsx`, `tutor-panel.tsx`, `tutor-shell.tsx`, `ask-astra-button.tsx`, `tutor-context-setter.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/components/ui/sidebar.tsx`, `src/components/ui/mobile-header.tsx`
- Modify: `src/app/(dashboard)/classroom/[subjectSlug]/[topicSlug]/page.tsx`
- Modify: `src/app/(dashboard)/classroom/[subjectSlug]/[topicSlug]/practice/result/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–7; `useExamActive`, `can`, `tierOf`, `UpgradePrompt`, `buttonClass`.
- Produces:

```ts
export function TutorShell(props: { tier: SubscriptionTier; children: React.ReactNode }): JSX.Element;
export function AskAstraButton(props: { entry: TutorEntry; label?: string; className?: string }): JSX.Element;
export function TutorContextSetter(props: { entry: TutorEntry }): null;
export function useOpenAstra(): () => void; // opens with the page's context; used by nav entries
```

- [ ] **Step 1: Read the Next.js docs first**

Read the `next/dynamic` and layout/client-boundary notes under `node_modules/next/dist/docs/01-app/` and confirm `dynamic(() => import(...), { ssr: false })` is still the supported way to defer a client component in this version. Adjust the snippets below if the docs say otherwise.

- [ ] **Step 2: Conversation + locked state**

`src/components/tutor/tutor-locked.tsx` — one canned sample reply and the existing upgrade prompt:

```tsx
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { AstraAvatar } from "./astra-avatar";

export function TutorLocked() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
          Why do plants need sunlight?
        </p>
      </div>
      <div className="flex items-start gap-2.5">
        <AstraAvatar />
        <p className="max-w-[85%] rounded-2xl rounded-tl-md bg-secondary px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
          Plants use sunlight to make their own food, a process called{" "}
          <strong className="font-semibold">photosynthesis</strong>. Light is
          the energy that turns water and carbon dioxide into glucose.
        </p>
      </div>
      <UpgradePrompt
        feature="Astra"
        requiredTier="PREMIUM"
        description="Ask Astra to explain any lesson or question, step by step, whenever you're stuck."
      />
    </div>
  );
}
```
(Confirm `UpgradePrompt`'s remaining props/CTA by reading the rest of `upgrade-prompt.tsx`; it links to billing already.)

`src/components/tutor/tutor-conversation.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useTutorChat } from "@/hooks/use-tutor-chat";
import { ladderFor, startersFor, type Chip } from "@/lib/tutor/chips";
import type { TutorContext, TutorMessage, TutorStatus } from "@/lib/tutor/types";
import { AstraAvatar } from "./astra-avatar";
import { TutorChips } from "./tutor-chips";
import { TutorComposer } from "./tutor-composer";
import { TutorMessageView } from "./tutor-message";

function resetLabel(iso: string | null | undefined): string {
  if (!iso) return "tomorrow";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function TutorConversation({
  threadId,
  context,
  initialMessages,
  status,
}: {
  threadId: string;
  context: TutorContext;
  initialMessages: TutorMessage[];
  status: TutorStatus;
}) {
  const { state, send, retry, stop, rate } = useTutorChat({ threadId, context, initialMessages });
  const endRef = useRef<HTMLDivElement>(null);
  const streaming = state.phase === "streaming";
  const remaining = state.remainingToday ?? status.remainingToday;
  const exhausted = remaining <= 0 || state.error?.code === "RATE_LIMITED";
  const empty = state.messages.length === 0;
  const chips = ladderFor(context, state.hintsUsed) ?? (empty ? startersFor(context) : []);

  // Follow the reply as it grows; reduced-motion users get an instant jump.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ block: "end", behavior: reduce ? "auto" : "smooth" });
  }, [state.messages, state.phase]);

  const pick = (chip: Chip) => send({ text: chip.text, action: chip.action });
  const lastIndex = state.messages.length - 1;

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite" aria-busy={streaming}>
        {empty && (
          <div className="flex items-start gap-2.5">
            <AstraAvatar />
            <p className="rounded-2xl rounded-tl-md bg-secondary px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
              Hi! Stuck on something? Pick one below or ask me anything.
            </p>
          </div>
        )}
        {state.messages.map((m, i) => (
          <TutorMessageView
            key={m.id}
            message={m}
            streaming={streaming && i === lastIndex && m.role === "astra"}
            isLast={i === lastIndex}
            onRate={rate}
            onAction={(action, label) => send({ text: label, action })}
          />
        ))}

        {state.phase === "error" && state.error && (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-foreground">
            {state.error.code === "RATE_LIMITED" ? (
              <p>You&apos;ve used today&apos;s questions. Astra is back at {resetLabel(state.error.resetsAt)}.</p>
            ) : (
              <>
                <p>{state.error.message}</p>
                <button type="button" onClick={retry} className="mt-2 min-h-11 font-bold text-primary">
                  Try again
                </button>
              </>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {chips.length > 0 && !streaming && !exhausted && <TutorChips chips={chips} onPick={pick} />}

      {remaining > 0 && remaining <= 3 && !exhausted && (
        <p className="px-4 pb-2 text-xs text-muted">{remaining} question{remaining === 1 ? "" : "s"} left today</p>
      )}

      <TutorComposer
        streaming={streaming}
        disabled={exhausted}
        onSend={(text) => send({ text, action: null })}
        onStop={stop}
      />
    </>
  );
}
```

- [ ] **Step 3: Panel (sheet on mobile, dock on desktop)**

`src/components/tutor/tutor-panel.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { LuMaximize2, LuMinimize2, LuX } from "react-icons/lu";
import { useTutorStatus, useTutorThread } from "@/hooks/api/use-tutor";
import { contextKey } from "@/lib/tutor/context";
import type { SubscriptionTier } from "@/lib/subscription";
import { can } from "@/lib/subscription";
import { selectActiveEntry, useTutorStore } from "@/stores/tutor-store";
import { cn } from "@/lib/utils";
import { AstraAvatar } from "./astra-avatar";
import { TutorConversation } from "./tutor-conversation";
import { TutorLocked } from "./tutor-locked";

const FOCUSABLE = 'button, [href], textarea, input, [tabindex]:not([tabindex="-1"])';

export default function TutorPanel({ tier }: { tier: SubscriptionTier }) {
  const open = useTutorStore((s) => s.open);
  const entry = useTutorStore(selectActiveEntry);
  const pageEntry = useTutorStore((s) => s.pageEntry);
  const closePanel = useTutorStore((s) => s.closePanel);
  const detach = useTutorStore((s) => s.detach);
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const entitled = can(tier, "aiTutor");
  const status = useTutorStatus(open && entitled);
  const allowed = entitled && status.data?.allowed !== false;
  const thread = useTutorThread(entry.context, open && allowed);

  // Esc closes; on phones the sheet is modal, so Tab is kept inside it.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePanel();
      const modal = !window.matchMedia("(min-width: 1024px)").matches;
      if (e.key !== "Tab" || !modal || !ref.current) return;
      const nodes = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => !n.hasAttribute("disabled"));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closePanel]);

  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLElement>("textarea, button")?.focus();
  }, [open]);

  if (!open) return null;

  const detachable = entry.context.type !== "general" && (pageEntry !== null || entry.label);

  return (
    <>
      {/* Phones only: the sheet is modal, the desktop dock is not. */}
      <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={closePanel} aria-hidden />
      <aside
        ref={ref}
        role="dialog"
        aria-label="Astra, your study buddy"
        className={cn(
          "fixed z-50 flex flex-col bg-card shadow-xl",
          "inset-x-0 bottom-0 rounded-t-2xl border-t border-border",
          expanded ? "h-[100dvh] rounded-none" : "h-[75dvh]",
          "lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-[400px] lg:rounded-none lg:border-l lg:border-t-0",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border lg:hidden" aria-hidden />
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <AstraAvatar className="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold leading-tight text-foreground">Astra</h2>
            <p className="text-xs text-muted">Your study buddy</p>
          </div>
          <button type="button" onClick={() => setExpanded((v) => !v)} aria-label={expanded ? "Shrink" : "Expand"} className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-secondary lg:hidden">
            {expanded ? <LuMinimize2 className="h-4 w-4" /> : <LuMaximize2 className="h-4 w-4" />}
          </button>
          <button type="button" onClick={closePanel} aria-label="Close Astra" className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-secondary">
            <LuX className="h-5 w-5" />
          </button>
        </header>

        {entry.context.type !== "general" && entry.label && (
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <span className="min-w-0 flex-1 truncate rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-soft-foreground">
              {entry.label}
            </span>
            {detachable && (
              <button type="button" onClick={detach} aria-label="Stop using this lesson as context" className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-secondary">
                <LuX className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {!allowed ? (
          <div className="flex-1 overflow-y-auto">
            {entitled && status.data?.reason ? (
              <p className="p-4 text-sm text-muted">{status.data.reason}</p>
            ) : (
              <TutorLocked />
            )}
          </div>
        ) : thread.isPending || status.isPending ? (
          <div className="flex-1 p-4 text-sm text-muted" role="status">Getting Astra ready…</div>
        ) : thread.isError || !thread.data || !status.data ? (
          <div className="flex-1 p-4 text-sm text-foreground" role="alert">
            Couldn&apos;t reach Astra.{" "}
            <button type="button" onClick={() => void thread.refetch()} className="min-h-11 font-bold text-primary">Try again</button>
          </div>
        ) : (
          <TutorConversation
            key={thread.data.threadId}
            threadId={thread.data.threadId}
            context={entry.context}
            initialMessages={thread.data.messages}
            status={status.data}
          />
        )}
      </aside>
    </>
  );
}
```
Note: `key={thread.data.threadId}` remounts the conversation per thread, as the chat hook requires. `contextKey` is imported only if needed for a future cache key; remove the unused import if lint flags it.

- [ ] **Step 4: Shell, entry components**

`src/components/tutor/tutor-shell.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { LuStar } from "react-icons/lu";
import { useExamActive } from "@/stores/exam-store";
import { useTutorStore } from "@/stores/tutor-store";
import type { SubscriptionTier } from "@/lib/subscription";
import { cn } from "@/lib/utils";

// The panel, KaTeX and the chat code load on first open, not with the page:
// most students are on metered data and most page views never open Astra.
const TutorPanel = dynamic(() => import("./tutor-panel"), { ssr: false });

export function TutorShell({ tier, children }: { tier: SubscriptionTier; children: React.ReactNode }) {
  const open = useTutorStore((s) => s.open);
  const openPanel = useTutorStore((s) => s.openPanel);
  const closePanel = useTutorStore((s) => s.closePanel);
  const examActive = useExamActive();

  // Never available mid-exam: close it if an exam starts while it is open.
  useEffect(() => {
    if (examActive) closePanel();
  }, [examActive, closePanel]);

  const visible = open && !examActive;

  return (
    <>
      {/* Desktop: content makes room for the dock instead of sitting under it. */}
      <div className={cn(visible && "lg:pr-[400px]")}>{children}</div>

      {!visible && !examActive && (
        <button
          type="button"
          onClick={() => openPanel()}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg lg:bottom-6"
        >
          <LuStar className="h-4 w-4" aria-hidden />
          Ask Astra
        </button>
      )}

      {visible && <TutorPanel tier={tier} />}
    </>
  );
}
```
Why the layout needs `lg:pr-[400px]` on a wrapper: the existing `<main className="lg:pl-64 …">` stays untouched; the wrapper goes **around** it.

`src/components/tutor/ask-astra-button.tsx`:

```tsx
"use client";

import { LuStar } from "react-icons/lu";
import { useExamActive } from "@/stores/exam-store";
import { useTutorStore, type TutorEntry } from "@/stores/tutor-store";
import { cn } from "@/lib/utils";

/** Opens Astra on a specific item ("Explain this"). Renders nothing mid-exam. */
export function AskAstraButton({ entry, label = "Explain this", className }: { entry: TutorEntry; label?: string; className?: string }) {
  const openPanel = useTutorStore((s) => s.openPanel);
  const examActive = useExamActive();
  if (examActive) return null;
  return (
    <button
      type="button"
      onClick={() => openPanel(entry)}
      className={cn("inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-bold text-primary transition-colors hover:bg-primary-soft", className)}
    >
      <LuStar className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
```

`src/components/tutor/tutor-context-setter.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useTutorStore, type TutorEntry } from "@/stores/tutor-store";

/** Rendered by a page to tell Astra what the student is looking at. */
export function TutorContextSetter({ entry }: { entry: TutorEntry }) {
  const setPageEntry = useTutorStore((s) => s.setPageEntry);
  const { context, label } = entry;
  const key = JSON.stringify(context);

  useEffect(() => {
    setPageEntry({ context: JSON.parse(key), label });
    return () => setPageEntry(null);
  }, [key, label, setPageEntry]);

  return null;
}
```

- [ ] **Step 5: Wire into layout and nav**

`src/app/(dashboard)/layout.tsx`: import `TutorShell` and `tierOf` (`@/lib/entitlements`); wrap the existing `<main>…</main>` element **only** (not the sidebar or headers):

```tsx
<TutorShell tier={tierOf(user.tier)}>
  <main className="lg:pl-64 pb-20 lg:pb-0"> … unchanged … </main>
</TutorShell>
```

`src/components/ui/sidebar.tsx`: after the `NAV_GROUPS.map(...)` block inside `<nav>`, add an "Astra" button styled like the nav items, `onClick={() => openPanel()}`, `disabled={useExamActive()}` (reuse the existing `examActive` value in that component), icon `LuStar`, plus a small `Premium` text hint when `!can(tier,"aiTutor")` is **not** needed — the locked panel already explains. Use `useTutorStore((s) => s.openPanel)`.

`src/components/ui/mobile-header.tsx`: same button inside the drawer after the groups, calling `openPanel()` then `setOpen(false)`. The bottom nav stays at five tabs (its comment says five is the thumb-reach maximum); the floating "Ask Astra" pill is the one-tap entry on phones.

- [ ] **Step 6: Lesson and result entry points**

Topic page (`…/[topicSlug]/page.tsx`): import `TutorContextSetter`; as the first child inside the returned root `<div className="animate-fade-in">`, add (only when a lesson exists):

```tsx
{lesson && (
  <TutorContextSetter
    entry={{ context: { type: "lesson", lessonId: lesson.id }, label: `${topic.title} · ${subject.name}` }}
  />
)}
```

Practice result page (`…/practice/result/page.tsx`): import `AskAstraButton`; inside each `missed.map` card, after the explanation `<p>` (line ~230), add:

```tsx
<AskAstraButton
  className="mt-3"
  label="Explain this to me"
  entry={{
    context: { type: "question", questionId: q.id, attemptId },
    label: `Question ${i + 1}`,
  }}
/>
```
(`attemptId` is already in scope from `searchParams`; confirm `q.id` is the bank question id the BE expects. If the result payload uses a different field, use that and tell the BE team which id this is.)

Scope note: other surfaces (past-paper review, mock-exam review, quick quiz) get the same one-line `AskAstraButton` in a follow-up; they are not in this plan.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: clean; all existing tests plus the new ones pass.

Manual pass (no BE yet): temporarily point `API_URL` at a tiny local server returning the fixture, or in dev stub `streamTutorReply`'s `fetchImpl`. Check at 360px and 1280px widths, light and dark:
- Pill shows on dashboard, opens sheet (mobile) / dock with content reflowing (desktop).
- Premium vs Free: Free shows locked state with sample + upgrade prompt.
- Esc closes; Tab stays inside the sheet on mobile.
- Start a mock exam: pill and sidebar entry disappear and an open panel closes.
- Offline (DevTools): inline "Couldn't reach Astra" with Try again, no duplicate student bubble.

- [ ] **Step 8: Commit**

```bash
git add src/components/tutor src/app src/components/ui/sidebar.tsx src/components/ui/mobile-header.tsx
git commit -m "feat(tutor): Astra panel, shell and entry points"
```

---

## Self-Review Notes

- **Spec coverage:** surfaces/entry points (Task 8), persona/subline/footer (7–8), starter chips + hint ladder + explain differently (4, 7, 8), states: empty/streaming/error/rate-limited/locked/off-topic (4, 7, 8; off-topic needs no special UI — it is a normal message), contract: context, endpoints, send body, SSE events, error codes (1–3, 6), gating `aiTutor` (1, 8), persistence via `threads/current` (6, 8), accessibility (dialog, Esc, focus trap, aria-live, reduced motion) (7–8), lazy loading (8), tests (2–5, 7).
- **Deviations from spec to confirm:** (1) routes are `/api/tutor/...` to match the app's `/api` prefix; (2) the "answered question" chips are neutral ("Explain the answer…") because the FE doesn't know whether the attempt was right; the result page only lists missed questions, so the spec's "Why was I wrong?" wording can be restored there with a one-line change if wanted; (3) the "Explain this" selection and past-paper/mock review entry points are deferred as the spec's own v1 scope allows.
- **Not in this plan:** BE implementation, the landing-page re-enable (do when Astra ships), usage metering UI beyond "N left today".
