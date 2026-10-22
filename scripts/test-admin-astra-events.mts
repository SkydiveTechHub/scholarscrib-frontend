import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeFrame } from "../src/lib/admin-astra/events";
import { mapMessage } from "../src/lib/admin-astra/map";
import { createAdminEventCursor } from "../src/lib/admin-astra/event-cursor";

const proposal = {
  kind: "actionProposal",
  status: "pending",
  actionId: "act-1",
  checkpointId: "cp",
  tool: "set_student_status",
  args: { userId: "u1", isActive: true, reason: "Leave" },
  summary: "Deactivate Ada",
  destructive: false,
  fields: [
    { key: "isActive", label: "Active", type: "boolean", required: true },
    { key: "reason", label: "Reason", type: "string", required: true },
    { key: "userId", label: "User", type: "string", required: true },
  ],
};

test("keeps the SSE id and a boolean field", () => {
  const event = decodeFrame({
    event: "actionProposal",
    data: JSON.stringify(proposal),
    id: "4",
  });
  assert.equal(event?.eventId, "4");
  assert.equal(event?.type, "actionProposal");
  if (event?.type !== "actionProposal") return;
  assert.equal(event.proposal.fields?.[0].type, "boolean");
  assert.equal(event.proposal.fields?.some((field) => field.key === "userId"), false);
});

test("a broken tool or ui frame is ignored", () => {
  assert.equal(decodeFrame({ event: "tool", data: '{"name":"search_students"}' }), null);
  assert.equal(decodeFrame({ event: "ui", data: '{"component":"worked_example"}' }), null);
  assert.equal(decodeFrame({ event: "route", data: "{}" }), null);
});

test("paused done keeps the pending card", () => {
  const event = decodeFrame({
    event: "done",
    data: JSON.stringify({ ok: true, paused: true, pendingAction: proposal }),
  });
  assert.equal(event?.type, "done");
  if (event?.type !== "done") return;
  assert.equal(event.paused, true);
  assert.equal(event.pendingAction?.tool, "set_student_status");
});

test("a settled groundedOn item is not a card", () => {
  const message = mapMessage({
    id: "a1",
    role: "assistant",
    content: "Deactivate Ada",
    groundedOn: [
      {
        status: "executed",
        tool: "update_student",
        summary: "Updated Ada",
        args: { userId: "u1" },
      },
    ],
    ui: [],
    tools: [],
  });
  assert.equal(message?.proposal, undefined);
  assert.equal(message?.settled?.status, "executed");
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
  const cursor = createAdminEventCursor("thread-1", storage);
  assert.equal(cursor.accept("1"), true);
  assert.equal(cursor.accept("1"), false);
  assert.equal(cursor.lastId(), "1");
  assert.equal([...store.keys()][0]?.startsWith("admin-astra-event-ids:"), true);
  cursor.clear();
  assert.equal(cursor.lastId(), null);
});
