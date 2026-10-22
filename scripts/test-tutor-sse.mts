import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSseParser } from "../src/lib/tutor/sse";
import { decodeFrame } from "../src/lib/tutor/events";
import { errorCodeForStatus } from "../src/lib/tutor/client";
import { createEventCursor } from "../src/lib/tutor/event-cursor";

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
    ["userMessage", "status", "token", "token", "assistantMessage", "done"],
  );
});

test("same result when split at every character boundary", () => {
  const whole = parseAll([FIXTURE]);
  const split = parseAll(FIXTURE.split(""));
  assert.deepEqual(split, whole);
});

test("CRLF line endings, even split between \\r and \\n", () => {
  const frames = parseAll(['event: token\r\ndata: {"text":"a"}\r', "\n\r\n"]);
  assert.equal(frames.length, 1);
  assert.equal(frames[0].event, "token");
});

test("multi-line data is joined with newlines", () => {
  const frames = parseAll(["event: token\ndata: one\ndata: two\n\n"]);
  assert.equal(frames[0].data, "one\ntwo");
});

test("an incomplete trailing frame is not emitted", () => {
  assert.equal(parseAll(['event: token\ndata: {"text":"x"}\n']).length, 0);
});

test("decodeFrame types the fixture events", () => {
  const events = parseAll([FIXTURE]).map(decodeFrame);
  assert.equal(events[0]?.type, "userMessage");
  assert.equal(events[1]?.type, "status");
  assert.deepEqual(events[2], { type: "token", text: "Chlorophyll is the " });
  assert.equal(events[4]?.type, "assistantMessage");
  if (events[4]?.type === "assistantMessage") {
    assert.equal(
      events[4].message.content,
      "Chlorophyll is the green pigment in leaves.",
    );
    assert.equal(events[4].message.groundedOn[0]?.title, "Photosynthesis");
  }
  assert.deepEqual(events[5], { type: "done" });
});

test("unknown event names are ignored (forward compatible)", () => {
  assert.equal(decodeFrame({ event: "future", data: "{}" }), null);
});

test("a malformed known event becomes a retryable error, not a silent drop", () => {
  const event = decodeFrame({ event: "token", data: "{not json" });
  assert.equal(event?.type, "error");
  assert.equal(event && event.type === "error" ? event.code : "", "UNAVAILABLE");
});

test("HTTP status maps to tutor error codes", () => {
  assert.equal(errorCodeForStatus(403), "TIER_REQUIRED");
  assert.equal(errorCodeForStatus(429), "RATE_LIMITED");
  assert.equal(errorCodeForStatus(503), "UNAVAILABLE");
  assert.equal(errorCodeForStatus(404), "CONTEXT_NOT_FOUND");
  assert.equal(errorCodeForStatus(409), "ACTION_PENDING");
});

const proposal = {
  actionId: "act-1",
  checkpointId: "cp-1",
  tool: "delete_study_plan",
  args: null,
  summary: "Delete your study plan.",
  destructive: true,
  status: "pending" as const,
};

test("decodes a paused action proposal and its done payload", () => {
  assert.deepEqual(
    decodeFrame({ event: "actionProposal", data: JSON.stringify(proposal) }),
    { type: "actionProposal", proposal },
  );
  assert.deepEqual(
    decodeFrame({
      event: "done",
      data: JSON.stringify({ ok: true, paused: true, pendingAction: proposal }),
    }),
    { type: "done", paused: true, pendingAction: proposal },
  );
});

test("an assistant message keeps an action proposal in groundedOn", () => {
  const event = decodeFrame({
    event: "assistantMessage",
    data: JSON.stringify({
      id: "a",
      role: "assistant",
      content: "Shall I delete it?",
      groundedOn: [
        { kind: "actionProposal", ...proposal },
        { sourceType: "lesson", lessonId: "L1", title: "Photosynthesis" },
      ],
    }),
  });
  assert.equal(event?.type, "assistantMessage");
  if (event?.type !== "assistantMessage") return;
  const [card, source] = event.message.groundedOn;
  assert.equal("kind" in card && card.kind, "actionProposal");
  assert.equal("title" in source && source.title, "Photosynthesis");
});

test("action results decode with or without an id", () => {
  assert.deepEqual(decodeFrame({ event: "actionExecuted", data: "{}" }), {
    type: "actionExecuted",
  });
  assert.deepEqual(
    decodeFrame({
      event: "actionRejected",
      data: JSON.stringify({ actionId: "act-1" }),
    }),
    { type: "actionRejected", actionId: "act-1" },
  );
});

test("a settled proposal is kept as text and is not a card", () => {
  const event = decodeFrame({
    event: "proposalSettled",
    data: JSON.stringify({
      id: "a",
      role: "assistant",
      content: "Delete your study plan.",
      groundedOn: [{ status: "executed", actionId: "act-1" }],
    }),
  });
  assert.equal(event?.type, "proposalSettled");
  if (event?.type !== "proposalSettled") return;
  assert.equal(event.message.content, "Delete your study plan.");
  assert.equal(event.message.groundedOn.length, 0);
});

test("only a pending actionProposal grounding redraws the card", () => {
  const settled = decodeFrame({
    event: "assistantMessage",
    data: JSON.stringify({
      id: "a",
      role: "assistant",
      content: "Delete your study plan.",
      groundedOn: [
        { status: "rejected", actionId: "act-1" },
        { kind: "actionProposal", actionId: "act-1", status: "executed" },
      ],
    }),
  });
  assert.equal(settled?.type, "assistantMessage");
  if (settled?.type === "assistantMessage") {
    assert.equal(settled.message.groundedOn.length, 0);
  }
});

test("a malformed action proposal is an error, not a dropped frame", () => {
  const event = decodeFrame({ event: "actionProposal", data: "{}" });
  assert.equal(event?.type, "error");
});

test("keeps the SSE id and stamps it on the decoded event", () => {
  const frames = parseAll(['id: 7\nevent: token\ndata: {"text":"a"}\n\n']);
  assert.equal(frames[0]?.id, "7");
  assert.deepEqual(decodeFrame(frames[0]), {
    type: "token",
    text: "a",
    eventId: "7",
  });
});

test("a broken tool or unknown study card is ignored", () => {
  assert.equal(decodeFrame({ event: "tool", data: "{}" }), null);
  assert.equal(
    decodeFrame({
      event: "ui",
      data: JSON.stringify({ id: "u1", component: "dashboard", props: {} }),
    }),
    null,
  );
  assert.equal(
    decodeFrame({
      event: "ui",
      data: JSON.stringify({
        id: "u2",
        component: "worked_example",
        props: { problem: "x", steps: [] },
      }),
    }),
    null,
  );
});

test("decodes a tool and a practice question without its answer", () => {
  const tool = decodeFrame({
    event: "tool",
    data: JSON.stringify({
      id: "t1",
      name: "grade_documents",
      phase: "running",
      summary: "Checking lesson notes…",
    }),
  });
  assert.deepEqual(tool, {
    type: "tool",
    tool: {
      id: "t1",
      name: "grade_documents",
      phase: "running",
      summary: "Checking lesson notes…",
    },
  });
  const card = decodeFrame({
    event: "ui",
    data: JSON.stringify({
      id: "q1",
      component: "practice_question",
      props: { prompt: "What is 2+2?", choices: ["4"], answer: "4" },
    }),
  });
  assert.equal(card?.type, "ui");
  if (card?.type === "ui" && card.block.component === "practice_question") {
    assert.deepEqual(card.block.props, { prompt: "What is 2+2?", choices: ["4"] });
    assert.equal("answer" in card.block.props, false);
  } else {
    assert.fail("expected a practice question");
  }
});

test("event cursor skips ids it has already applied", () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  } as Storage;
  const cursor = createEventCursor("t1", storage);
  assert.equal(cursor.accept("1"), true);
  assert.equal(cursor.accept("1"), false);
  assert.equal(cursor.lastId(), "1");
  const again = createEventCursor("t1", storage);
  assert.equal(again.accept("1"), false);
  assert.equal(again.accept("2"), true);
  again.clear();
  assert.equal(createEventCursor("t1", storage).lastId(), null);
});
