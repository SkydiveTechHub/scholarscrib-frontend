import { test } from "node:test";
import assert from "node:assert/strict";
import { contextKey, createBodyFor } from "../src/lib/tutor/context";
import { ladderFor, startersFor } from "../src/lib/tutor/chips";
import {
  chatReducer,
  DRAFT_ID,
  initialChatState,
} from "../src/lib/tutor/chat-state";
import type {
  TutorApiMessage,
  TutorSendRequest,
  TutorStreamEvent,
} from "../src/lib/tutor/types";
import { TUTOR_MAX_CHARS } from "../src/lib/tutor/types";

const REQ: TutorSendRequest = {
  text: "What is chlorophyll?",
  action: null,
};

const apiUser = (id = "u1"): TutorApiMessage => ({
  id,
  role: "user",
  content: REQ.text,
  groundedOn: [],
  createdAt: null,
});

const apiAssistant = (
  content: string,
  id = "a1",
  groundedOn: TutorApiMessage["groundedOn"] = [],
): TutorApiMessage => ({
  id,
  role: "assistant",
  content,
  groundedOn,
  createdAt: null,
});

const run = (events: TutorStreamEvent[], start = initialChatState([])) =>
  events.reduce((s, event) => chatReducer(s, { type: "event", event }), start);

const sent = (pendingUserId = "pending-c1") =>
  chatReducer(initialChatState([]), {
    type: "send",
    request: REQ,
    pendingUserId,
  });

test("contextKey is stable and distinct per context", () => {
  assert.equal(contextKey({ type: "general" }), "general");
  assert.equal(contextKey({ type: "lesson", lessonId: "L1" }), "lesson:L1");
  assert.equal(contextKey({ type: "question", questionId: "Q1" }), "question:Q1");
  assert.equal(
    contextKey({ type: "topic", subjectSlug: "bio", topicSlug: "cells" }),
    "topic:bio/cells",
  );
});

test("createBodyFor scopes lesson and question creates", () => {
  assert.deepEqual(
    createBodyFor({
      type: "lesson",
      lessonId: "L1",
      subjectId: "S1",
      topicId: "T1",
    }),
    { lessonId: "L1", subjectId: "S1", topicId: "T1" },
  );
  assert.deepEqual(
    createBodyFor({
      type: "question",
      questionId: "Q1",
      wrongAnswerContext: "B",
    }),
    { questionId: "Q1", wrongAnswerContext: "B" },
  );
  assert.deepEqual(createBodyFor({ type: "general" }), {});
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

test("starters differ by context and stay within the API max", () => {
  assert.equal(TUTOR_MAX_CHARS, 8000);
  for (const ctx of [
    { type: "lesson", lessonId: "L" },
    { type: "question", questionId: "Q", attemptId: "A" },
    { type: "general" },
  ] as const) {
    const chips = startersFor(ctx);
    assert.ok(chips.length >= 3);
    assert.ok(chips.every((c) => c.text.length > 0 && c.text.length <= TUTOR_MAX_CHARS));
  }
});

test("send appends student bubble and starts streaming (no draft yet)", () => {
  const s = sent();
  assert.equal(s.phase, "streaming");
  assert.deepEqual(
    s.messages.map((m) => m.role),
    ["student"],
  );
  assert.equal(s.pendingUserId, "pending-c1");
});

test("tokens draft then assistantMessage replaces draft as final truth", () => {
  const s = run(
    [
      { type: "userMessage", message: apiUser() },
      { type: "status", status: { node: "grade_documents" } },
      { type: "token", text: "Chlorophyll is " },
      { type: "token", text: "green." },
      {
        type: "assistantMessage",
        message: apiAssistant("Chlorophyll is the green pigment.", "a1", [
          { sourceType: "lesson", lessonId: "L1", title: "Photosynthesis" },
        ]),
      },
      { type: "done" },
    ],
    sent(),
  );
  assert.equal(s.phase, "idle");
  assert.equal(s.statusLine, null);
  const reply = s.messages[1];
  assert.equal(reply.id, "a1");
  assert.equal(reply.role, "astra");
  assert.equal(reply.text, "Chlorophyll is the green pigment.");
  assert.equal(reply.groundedOn?.[0]?.title, "Photosynthesis");
  assert.ok(!s.messages.some((m) => m.id === DRAFT_ID));
});

test("assistantMessage with no tokens still appends the reply", () => {
  const s = run(
    [
      { type: "userMessage", message: apiUser() },
      { type: "assistantMessage", message: apiAssistant("Hi there!") },
      { type: "done" },
    ],
    sent(),
  );
  assert.equal(s.messages[1].text, "Hi there!");
  assert.equal(s.phase, "idle");
});

test("soft-refuse assistantMessage replaces streamed draft text", () => {
  const s = run(
    [
      { type: "token", text: "Osmosis is " },
      {
        type: "assistantMessage",
        message: apiAssistant(
          "I do not have enough grounded material to answer that.",
        ),
      },
      { type: "done" },
    ],
    sent(),
  );
  assert.equal(
    s.messages[1].text,
    "I do not have enough grounded material to answer that.",
  );
});

test("error before any text leaves only the student bubble", () => {
  const s = run(
    [{ type: "error", code: "UNAVAILABLE", message: "down" }],
    sent(),
  );
  assert.equal(s.phase, "error");
  assert.equal(s.messages.length, 1);
  assert.equal(s.error?.code, "UNAVAILABLE");
});

test("error after partial tokens keeps draft text for retry context", () => {
  const s = run(
    [
      { type: "token", text: "Half an ans" },
      { type: "error", code: "UNAVAILABLE", message: "dropped" },
    ],
    sent(),
  );
  assert.equal(s.messages[1].text, "Half an ans");
  assert.equal(s.phase, "error");
});

test("429 sets rateLimitedUntil from retryAfterSec", () => {
  const before = Date.now();
  const s = run(
    [
      {
        type: "error",
        code: "RATE_LIMITED",
        message: "slow down",
        retryAfterSec: 30,
      },
    ],
    sent(),
  );
  assert.ok(s.rateLimitedUntil != null && s.rateLimitedUntil >= before + 30_000);
});

test("hint_next requests count toward the ladder", () => {
  const hint: TutorSendRequest = {
    text: "Give me a hint",
    action: "hint_next",
  };
  let s = chatReducer(initialChatState([]), {
    type: "send",
    request: hint,
    pendingUserId: "h1",
  });
  s = run([{ type: "error", code: "UNAVAILABLE", message: "x" }], s);
  s = chatReducer(s, {
    type: "send",
    request: hint,
    pendingUserId: "h2",
  });
  assert.equal(s.hintsUsed, 2);
});

test("stopped drops empty draft; keeps partial draft text", () => {
  let s = run([{ type: "token", text: "Part" }], sent());
  s = chatReducer(s, { type: "stopped" });
  assert.equal(s.phase, "idle");
  assert.equal(s.messages[1].text, "Part");

  const empty = chatReducer(sent(), { type: "stopped" });
  assert.equal(empty.messages.length, 1);
});

test("reconcile replaces the transcript after abort", () => {
  const s = chatReducer(sent(), {
    type: "reconcile",
    messages: [
      { id: "u1", role: "student", text: "hi" },
      { id: "a1", role: "astra", text: "hello" },
    ],
  });
  assert.equal(s.phase, "idle");
  assert.equal(s.messages.length, 2);
  assert.equal(s.pendingUserId, null);
});

test("rating sets the thumb on one message", () => {
  const s = chatReducer(
    initialChatState([{ id: "m1", role: "astra", text: "hi" }]),
    { type: "rate", messageId: "m1", rating: "up" },
  );
  assert.equal(s.messages[0].rating, "up");
});
