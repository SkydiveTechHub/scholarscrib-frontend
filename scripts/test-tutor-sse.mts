import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSseParser } from "../src/lib/tutor/sse";
import { decodeFrame } from "../src/lib/tutor/events";
import { errorCodeForStatus } from "../src/lib/tutor/client";

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

test("a malformed action proposal is an error, not a dropped frame", () => {
  const event = decodeFrame({ event: "actionProposal", data: "{}" });
  assert.equal(event?.type, "error");
});
