import { test } from "node:test";
import assert from "node:assert/strict";
import { proposalEdits } from "../src/lib/admin-astra/proposals";
import { startersFor } from "../src/lib/admin-astra/starters";
import { adminAstraLauncherVisible } from "../src/lib/admin-astra/launcher";
import type { AstraProposal } from "../src/lib/admin-astra/types";

const proposal: AstraProposal = {
  actionId: "act-1",
  checkpointId: null,
  tool: "set_student_status",
  args: { userId: "u1", isActive: true, reason: "Leave" },
  summary: "Deactivate Ada",
  destructive: false,
  fields: [
    { key: "isActive", label: "Active", type: "boolean", required: true },
    { key: "reason", label: "Reason", type: "string", required: true, maxLength: 200 },
  ],
};

test("approve sends only the keys that changed", () => {
  const edited = proposalEdits(proposal, { isActive: true, reason: "Graduated" });
  assert.equal(edited.ok, true);
  if (!edited.ok) return;
  assert.deepEqual(edited.args, { reason: "Graduated" });
});

test("a boolean flips without touching the frozen id", () => {
  const edited = proposalEdits(proposal, { isActive: false, reason: "Leave" });
  assert.equal(edited.ok, true);
  if (!edited.ok) return;
  assert.deepEqual(edited.args, { isActive: false });
  assert.equal(Object.hasOwn(edited.args, "userId"), false);
});

test("an unchanged form runs the stored payload", () => {
  const edited = proposalEdits(proposal, { isActive: true, reason: "Leave" });
  assert.deepEqual(edited, { ok: true, args: null });
});

test("a blank required field is rejected", () => {
  const edited = proposalEdits(proposal, { isActive: true, reason: "  " });
  assert.equal(edited.ok, false);
  if (edited.ok) return;
  assert.equal(edited.errors.reason, "Required");
});

test("the floating launcher is hidden on the Astra page", () => {
  assert.equal(adminAstraLauncherVisible("/admin/students"), true);
  assert.equal(adminAstraLauncherVisible("/admin/astra"), false);
});

test("a non-owner does not see team or catalogue starters", () => {
  const plain = startersFor(false);
  const owner = startersFor(true);
  assert.equal(plain.some((item) => /team|catalogue/i.test(item)), false);
  assert.equal(owner.some((item) => item === "List the admin team"), true);
  assert.equal(owner.some((item) => item === "List catalogue subjects"), true);
});
