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

test("same result when split at every character boundary", () => {
  const whole = parseAll([FIXTURE]);
  const split = parseAll(FIXTURE.split(""));
  assert.deepEqual(split, whole);
});

test("CRLF line endings, even split between \r and \n", () => {
  const frames = parseAll(['event: delta\r\ndata: {"text":"a"}\r', "\n\r\n"]);
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
    data: JSON.stringify({
      code: "RATE_LIMITED",
      message: "Used up",
      resetsAt: "2026-10-21T00:00:00Z",
    }),
  });
  assert.deepEqual(event, {
    type: "error",
    code: "RATE_LIMITED",
    message: "Used up",
    resetsAt: "2026-10-21T00:00:00Z",
  });
});
