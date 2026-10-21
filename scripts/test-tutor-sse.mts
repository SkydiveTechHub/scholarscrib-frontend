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
});
