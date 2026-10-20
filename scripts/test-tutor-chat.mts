import { test } from "node:test";
import assert from "node:assert/strict";
import { contextKey, threadParams } from "../src/lib/tutor/context";
import { ladderFor, startersFor } from "../src/lib/tutor/chips";
import { chatReducer, initialChatState } from "../src/lib/tutor/chat-state";
import type { TutorSendRequest, TutorStreamEvent } from "../src/lib/tutor/types";

const REQ: TutorSendRequest = {
  text: "What is chlorophyll?",
  action: null,
  clientMessageId: "c1",
};
const run = (events: TutorStreamEvent[], start = initialChatState([])) =>
  events.reduce((s, event) => chatReducer(s, { type: "event", event }), start);
const sent = () => chatReducer(initialChatState([]), { type: "send", request: REQ });

test("contextKey is stable and distinct per context", () => {
  assert.equal(contextKey({ type: "general" }), "general");
  assert.equal(contextKey({ type: "lesson", lessonId: "L1" }), "lesson:L1");
  assert.equal(contextKey({ type: "question", questionId: "Q1" }), "question:Q1");
  assert.equal(
    contextKey({ type: "topic", subjectSlug: "bio", topicSlug: "cells" }),
    "topic:bio/cells",
  );
  assert.deepEqual(
    threadParams({ type: "topic", subjectSlug: "bio", topicSlug: "cells" }),
    { type: "topic", id: "bio/cells" },
  );
  assert.deepEqual(threadParams({ type: "general" }), { type: "general", id: "" });
});

test("an attempt id does not change the thread key", () => {
  assert.equal(
    contextKey({ type: "question", questionId: "Q1", attemptId: "A1" }),
    contextKey({ type: "question", questionId: "Q1" }),
  );
});

test("unanswered question uses the hint ladder; answered one does not", () => {
  const open = { type: "question", questionId: "Q1" } as const;
  assert.deepEqual(ladderFor(open, 0)?.map((c) => c.action), ["hint_next"]);
  assert.deepEqual(ladderFor(open, 1)?.map((c) => c.action), ["hint_next", "reveal"]);
  assert.deepEqual(ladderFor(open, 2)?.map((c) => c.action), ["reveal"]);
  assert.equal(
    ladderFor({ type: "question", questionId: "Q1", attemptId: "A1" }, 0),
    null,
  );
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
  const s = sent();
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
    sent(),
  );
  assert.equal(s.phase, "idle");
  assert.equal(s.remainingToday, 4);
  const reply = s.messages[1];
  assert.equal(reply.id, "m1");
  assert.equal(reply.text, "Chlorophyll");
  assert.deepEqual(reply.suggested, ["example"]);
});

test("error before any text removes the empty placeholder", () => {
  const s = run([{ type: "error", code: "UNAVAILABLE", message: "down" }], sent());
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
    sent(),
  );
  assert.equal(s.messages[1].text, "Half an ans");
  assert.equal(s.phase, "error");
});

test("retry with the same clientMessageId does not duplicate the student bubble", () => {
  let s = run([{ type: "error", code: "UNAVAILABLE", message: "down" }], sent());
  s = chatReducer(s, { type: "send", request: REQ });
  assert.equal(s.messages.filter((m) => m.role === "student").length, 1);
  assert.equal(s.messages.filter((m) => m.role === "astra").length, 1);
  assert.equal(s.phase, "streaming");
  assert.equal(s.error, null);
});

test("hint_next requests count toward the ladder; retrying one does not double count", () => {
  const hint: TutorSendRequest = {
    text: "Give me a hint",
    action: "hint_next",
    clientMessageId: "h1",
  };
  let s = chatReducer(initialChatState([]), { type: "send", request: hint });
  s = run([{ type: "error", code: "UNAVAILABLE", message: "x" }], s);
  s = chatReducer(s, { type: "send", request: hint });
  assert.equal(s.hintsUsed, 1);
});

test("stopped keeps partial text and returns to idle; an empty placeholder is dropped", () => {
  let s = run(
    [
      { type: "start", messageId: "m1", remainingToday: 4 },
      { type: "delta", text: "Part" },
    ],
    sent(),
  );
  s = chatReducer(s, { type: "stopped" });
  assert.equal(s.phase, "idle");
  assert.equal(s.messages[1].text, "Part");

  const empty = chatReducer(sent(), { type: "stopped" });
  assert.equal(empty.messages.length, 1);
});

test("rating sets the thumb on one message", () => {
  const s = chatReducer(
    initialChatState([{ id: "m1", role: "astra", text: "hi" }]),
    { type: "rate", messageId: "m1", rating: "up" },
  );
  assert.equal(s.messages[0].rating, "up");
});
