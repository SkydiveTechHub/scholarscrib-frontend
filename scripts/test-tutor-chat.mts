import { test } from "node:test";
import assert from "node:assert/strict";
import { mapApiMessage } from "../src/lib/tutor/map";
import { contextKey, createBodyFor } from "../src/lib/tutor/context";
import { ladderFor, startersFor } from "../src/lib/tutor/chips";
import {
  chatReducer,
  DRAFT_ID,
  initialChatState,
} from "../src/lib/tutor/chat-state";
import type {
  ActionProposal,
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

test("stopped keeps the question and marks the turn; edit removes it", () => {
  let s = run([{ type: "token", text: "Part" }], sent());
  s = chatReducer(s, { type: "stopped" });
  assert.equal(s.messages.length, 2);
  assert.equal(s.messages[0].stopped, true);
  assert.equal(s.messages[1].stopped, true);
  assert.equal(s.messages[1].text, "Part");

  const before = chatReducer(sent(), { type: "stopped" });
  assert.equal(before.messages.length, 1);
  assert.equal(before.messages[0].stopped, true);

  const edited = chatReducer(s, { type: "edit", messageId: s.messages[0].id });
  assert.equal(edited.messages.length, 0);

  const untouched = chatReducer(s, { type: "edit", messageId: "nope" });
  assert.equal(untouched, s);
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

const proposal: ActionProposal = {
  actionId: "act-1",
  checkpointId: "cp-1",
  tool: "create_study_plan",
  args: { hours: 2 },
  summary: "Create a term plan for Biology.",
  destructive: false,
};

function paused(start = sent()) {
  return run(
    [
      { type: "assistantMessage", message: apiAssistant("Shall I set that up?") },
      { type: "actionProposal", proposal },
      { type: "done", paused: true, pendingAction: proposal },
    ],
    start,
  );
}

test("a paused proposal leaves the card and blocks another send", () => {
  const s = paused();
  assert.equal(s.phase, "idle");
  assert.equal(s.resuming, false);
  assert.deepEqual(s.pendingAction, proposal);
  assert.equal(s.messages[1].actionProposal?.actionId, "act-1");
  assert.equal(s.messages.filter((m) => m.role === "student").length, 1);
  const blocked = chatReducer(s, {
    type: "send",
    request: REQ,
    pendingUserId: "p2",
  });
  assert.equal(blocked, s);
});

test("reload restores a pending card from the stored message", () => {
  const s = initialChatState([
    { id: "u", role: "student", text: "Make a plan" },
    { id: "a", role: "astra", text: "Shall I?", actionProposal: proposal },
  ]);
  assert.deepEqual(s.pendingAction, proposal);
  assert.equal(
    chatReducer(s, { type: "send", request: REQ, pendingUserId: "x" }),
    s,
  );
});

test("grounding on the assistant message redraws the card without a source chip", () => {
  const mapped = mapApiMessage(
    apiAssistant("Shall I?", "a9", [
      { kind: "actionProposal", ...proposal },
      { sourceType: "lesson", title: "Keep me" },
    ]),
  );
  assert.deepEqual(mapped.actionProposal, proposal);
  assert.equal(mapped.groundedOn?.length, 1);
  assert.equal(mapped.groundedOn?.[0]?.title, "Keep me");

  const s = run(
    [
      { type: "assistantMessage", message: apiAssistant("Shall I?", "a9", [
        { kind: "actionProposal", ...proposal },
      ]) },
      { type: "done", paused: true, pendingAction: null },
    ],
    sent(),
  );
  assert.equal(s.pendingAction?.actionId, "act-1");
  assert.equal(s.messages[1].text, "Shall I?");
});

test("approve clears the card without a new student message", () => {
  let s = paused();
  const before = s.messages.length;
  s = chatReducer(s, { type: "resume" });
  assert.equal(s.phase, "streaming");
  assert.equal(s.resuming, true);
  assert.equal(s.messages.length, before);
  s = run(
    [
      { type: "actionExecuted", actionId: "act-1" },
      {
        type: "assistantMessage",
        message: apiAssistant("Done. Your plan is ready.", "a2"),
      },
      { type: "done" },
    ],
    s,
  );
  assert.equal(s.pendingAction, null);
  assert.equal(s.resuming, false);
  assert.equal(s.phase, "idle");
  assert.equal(s.messages.filter((m) => m.role === "student").length, 1);
  assert.equal(s.messages.at(-1)?.text, "Done. Your plan is ready.");
  assert.equal(s.messages.some((m) => m.actionProposal), false);
});

test("reject clears the card without a new student message", () => {
  let s = chatReducer(paused(), { type: "resume" });
  s = run(
    [
      { type: "actionRejected" },
      { type: "assistantMessage", message: apiAssistant("Okay, leaving it.", "a2") },
      { type: "done" },
    ],
    s,
  );
  assert.equal(s.pendingAction, null);
  assert.equal(s.messages.filter((m) => m.role === "student").length, 1);
  assert.equal(s.messages.at(-1)?.text, "Okay, leaving it.");
});

test("a 409 keeps the card and drops the rejected message", () => {
  let s = paused();
  s = {
    ...s,
    phase: "streaming",
    pendingUserId: "extra",
    messages: [
      ...s.messages,
      { id: "extra", role: "student", text: "another" },
    ],
  };
  s = chatReducer(s, {
    type: "failed",
    error: {
      code: "ACTION_PENDING",
      message: "busy",
    },
  });
  assert.equal(s.pendingAction?.actionId, "act-1");
  assert.equal(s.messages.some((m) => m.id === "extra"), false);
  assert.equal(s.messages[1].actionProposal?.actionId, "act-1");
  assert.equal(s.phase, "error");
  assert.equal(s.error?.code, "ACTION_PENDING");
});

test("a dropped resume keeps the card and does not approve again", () => {
  let s = chatReducer(paused(), { type: "resume" });
  s = chatReducer(s, {
    type: "failed",
    error: {
      code: "UNAVAILABLE",
      message: "The connection dropped before Astra finished.",
    },
  });
  assert.equal(s.pendingAction?.actionId, "act-1");
  assert.equal(s.resuming, false);
  assert.equal(s.error?.code, "ACTION_RESUME");
  assert.match(s.error?.message ?? "", /try again/i);
  assert.equal(s.messages.filter((m) => m.role === "student").length, 1);
});

test("rating sets the thumb on one message", () => {
  const s = chatReducer(
    initialChatState([{ id: "m1", role: "astra", text: "hi" }]),
    { type: "rate", messageId: "m1", rating: "up" },
  );
  assert.equal(s.messages[0].rating, "up");
});
