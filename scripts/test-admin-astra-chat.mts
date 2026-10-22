import { test } from "node:test";
import assert from "node:assert/strict";
import {
  astraReducer,
  initialAstraState,
  type AstraState,
} from "../src/lib/admin-astra/chat-state";
import type { AstraMessage, AstraStreamEvent } from "../src/lib/admin-astra/types";

function apply(state: AstraState, event: AstraStreamEvent) {
  return astraReducer(state, { type: "event", event });
}

const proposal = {
  actionId: "act-1",
  checkpointId: null,
  tool: "update_student",
  args: { userId: "u1", firstName: "Ada" },
  summary: "Rename Ada",
  destructive: false,
  fields: [{ key: "firstName", label: "First name", type: "string" as const, required: true }],
};

test("tokens fill a draft and assistantMessage replaces it", () => {
  let state = astraReducer(initialAstraState([]), {
    type: "send",
    text: "Find Ada",
    pendingUserId: "local",
  });
  state = apply(state, { type: "token", text: "Ada " });
  state = apply(state, {
    type: "assistantMessage",
    message: { id: "a1", role: "assistant", text: "Ada Lovelace is Premium." },
  });
  assert.equal(state.messages.some((message) => message.id === "draft-assistant"), false);
  const reply = state.messages.find((message) => message.role === "assistant");
  assert.equal(reply?.text, "Ada Lovelace is Premium.");
  assert.equal(state.phase, "streaming");
});

test("status steps advance and clear once the reply is done", () => {
  let state = apply(initialAstraState([]), { type: "status", node: "classify_intent" });
  state = apply(state, { type: "status", node: "pick_domain" });
  assert.deepEqual(
    state.steps.map((step) => [step.label, step.phase]),
    [
      ["Reading the request…", "done"],
      ["Choosing the area…", "active"],
    ],
  );
  state = apply(state, { type: "status", node: "chitchat" });
  assert.equal(state.steps.at(-1)?.label, "Thinking…");
  state = apply(state, { type: "done" });
  assert.deepEqual(state.steps, []);
  assert.equal(state.phase, "idle");
});

test("tool phases update in place and stay on the final reply", () => {
  let state = apply(initialAstraState([]), {
    type: "tool",
    tool: { id: "tool_1", name: "search_students", phase: "running", summary: "Working on that…" },
  });
  state = apply(state, {
    type: "tool",
    tool: { id: "tool_1", name: "search_students", phase: "done", summary: "Working on that…" },
  });
  state = apply(state, {
    type: "assistantMessage",
    message: { id: "a1", role: "assistant", text: "One student." },
  });
  const tools = state.messages[0]?.tools;
  assert.equal(tools?.length, 1);
  assert.equal(tools?.[0].phase, "done");
});

test("stop keeps the user message and partial assistant text", () => {
  let state = astraReducer(initialAstraState([]), {
    type: "send",
    text: "Find Ada",
    pendingUserId: "local",
  });
  state = apply(state, { type: "token", text: "Looking" });
  state = astraReducer(state, { type: "stopped" });
  assert.equal(state.phase, "idle");
  assert.equal(state.messages[0]?.text, "Find Ada");
  assert.equal(state.messages[1]?.text, "Looking");
  assert.equal(state.messages[1]?.id === "draft-assistant", false);
});

test("a pending card blocks another send", () => {
  let state = apply(initialAstraState([]), { type: "actionProposal", proposal });
  const before = state.messages.length;
  state = astraReducer(state, { type: "send", text: "again", pendingUserId: "local-2" });
  assert.equal(state.messages.length, before);
  assert.equal(state.pendingAction?.actionId, "act-1");
});

test("reject settles the card and resume does not offer approve again", () => {
  let state = apply(initialAstraState([]), { type: "actionProposal", proposal });
  state = astraReducer(state, { type: "resume" });
  state = apply(state, { type: "actionRejected", actionId: "act-1" });
  state = apply(state, {
    type: "proposalSettled",
    message: {
      id: "a1",
      role: "assistant",
      text: "Rename Ada",
      settled: { summary: "Rename Ada", status: "rejected", tool: "update_student" },
    },
  });
  state = apply(state, {
    type: "assistantMessage",
    message: { id: "a2", role: "assistant", text: "Left that unchanged." },
  });
  state = apply(state, { type: "done" });
  const card = state.messages.find((message) => message.settled);
  assert.equal(card?.settled?.status, "rejected");
  assert.equal(card?.proposal ?? null, null);
  assert.equal(state.pendingAction, null);
  assert.equal(state.messages.some((message) => message.text === "Left that unchanged."), true);
});

test("an invalid payload leaves the card pending", () => {
  let state = apply(initialAstraState([]), { type: "actionProposal", proposal });
  state = astraReducer(state, { type: "resume" });
  state = apply(state, { type: "error", code: "INVALID", message: "Invalid action payload" });
  assert.equal(state.pendingAction?.actionId, "act-1");
  assert.equal(state.cardError, "Invalid action payload");
  assert.equal(state.phase, "idle");
});

test("a repeated user message is not added twice", () => {
  const message: AstraMessage = { id: "u1", role: "user", text: "Find Ada" };
  const state = apply(initialAstraState([message]), { type: "userMessage", message });
  assert.equal(state.messages.length, 1);
});
