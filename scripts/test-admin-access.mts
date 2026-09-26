import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canAccessConsole,
  canManageAdmins,
  canEditStudent,
  canSuspendStudent,
  canDeleteStudent,
  canForceSignOutStudent,
} from "../src/lib/admin-access";

test("an active admin may open the console", () => {
  assert.equal(canAccessConsole({ isActive: true }), true);
});

test("a deactivated admin may not, cookie notwithstanding", () => {
  // Revocation has to bite on the next request, not at cookie expiry.
  assert.equal(canAccessConsole({ isActive: false }), false);
});

test("a missing admin may not", () => {
  assert.equal(canAccessConsole(null), false);
});

test("only the owner manages admins", () => {
  assert.equal(canManageAdmins({ isActive: true, isOwner: true }), true);
  assert.equal(canManageAdmins({ isActive: true, isOwner: false }), false);
  assert.equal(canManageAdmins(null), false);
});

test("a deactivated owner manages nothing", () => {
  assert.equal(canManageAdmins({ isActive: false, isOwner: true }), false);
});

const ACTIVE_OWNER = { isActive: true, isOwner: true };
const ACTIVE_ADMIN = { isActive: true, isOwner: false };
const DEAD_OWNER = { isActive: false, isOwner: true };
const DEAD_ADMIN = { isActive: false, isOwner: false };

test("any active admin may edit a student", () => {
  assert.equal(canEditStudent(ACTIVE_OWNER), true);
  assert.equal(canEditStudent(ACTIVE_ADMIN), true);
});

test("a deactivated admin may not edit a student", () => {
  assert.equal(canEditStudent(DEAD_ADMIN), false);
  assert.equal(canEditStudent(DEAD_OWNER), false);
  assert.equal(canEditStudent(null), false);
});

test("any active admin may suspend a student", () => {
  // Suspension is reversible, so it is not held back to the owner.
  assert.equal(canSuspendStudent(ACTIVE_OWNER), true);
  assert.equal(canSuspendStudent(ACTIVE_ADMIN), true);
  assert.equal(canSuspendStudent(DEAD_ADMIN), false);
  assert.equal(canSuspendStudent(null), false);
});

test("only an active owner may delete a student", () => {
  // Deletion cascades across progress, attempts, mastery and flashcards.
  assert.equal(canDeleteStudent(ACTIVE_OWNER), true);
  assert.equal(canDeleteStudent(ACTIVE_ADMIN), false);
  assert.equal(canDeleteStudent(DEAD_OWNER), false);
  assert.equal(canDeleteStudent(null), false);
});

test("only an active owner may force a student sign-out", () => {
  assert.equal(canForceSignOutStudent(ACTIVE_OWNER), true);
  assert.equal(canForceSignOutStudent(ACTIVE_ADMIN), false);
  assert.equal(canForceSignOutStudent(DEAD_OWNER), false);
  assert.equal(canForceSignOutStudent(null), false);
});
