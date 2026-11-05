import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLogin, validateRegisterStep } from "../src/lib/auth-validation";

const step1 = {
  firstName: "Ada",
  lastName: "Obi",
  email: "ada@example.com",
  password: "secret1",
  classLevel: "",
  track: "",
  state: "",
};

test("login reports every missing field at once", () => {
  const errors = validateLogin({ email: "", password: "" });
  assert.ok(errors.email);
  assert.ok(errors.password);
});

test("login treats whitespace-only email as missing and rejects malformed ones", () => {
  assert.match(validateLogin({ email: "   ", password: "x" }).email!, /Enter your email/);
  assert.match(validateLogin({ email: "ada@", password: "x" }).email!, /valid email/);
  assert.deepEqual(validateLogin({ email: "ada@example.com", password: "x" }), {});
});

test("login does not apply the signup password minimum", () => {
  assert.deepEqual(validateLogin({ email: "a@b.co", password: "x" }), {});
});

test("register step 1 flags each empty field", () => {
  const errors = validateRegisterStep(1, { ...step1, firstName: " ", lastName: "", email: "", password: "" });
  assert.deepEqual(Object.keys(errors).sort(), ["email", "firstName", "lastName", "password"]);
});

test("register step 1 enforces the password minimum", () => {
  assert.match(validateRegisterStep(1, { ...step1, password: "abc" }).password!, /at least 6/);
  assert.deepEqual(validateRegisterStep(1, step1), {});
});

test("register step 2 requires class, track and state; ignores step 1 fields", () => {
  const errors = validateRegisterStep(2, { ...step1, firstName: "" });
  assert.deepEqual(Object.keys(errors).sort(), ["classLevel", "state", "track"]);
});

test("names are limited to 2-50 characters after trimming", () => {
  const ok = (firstName: string) => validateRegisterStep(1, { ...step1, firstName }).firstName;
  assert.equal(ok("a".repeat(50)), undefined);
  assert.match(ok("a".repeat(51))!, /longer than 50/);
  assert.match(ok("A")!, /at least 2/);
  assert.match(ok("   ")!, /Enter your first name/);
  assert.match(validateRegisterStep(1, { ...step1, lastName: "b".repeat(51) }).lastName!, /last name can't be longer than 50/);
});

test("password is limited to 6-25 characters", () => {
  const pw = (password: string) => validateRegisterStep(1, { ...step1, password }).password;
  assert.equal(pw("p".repeat(25)), undefined);
  assert.match(pw("p".repeat(26))!, /longer than 25/);
  assert.match(pw("p".repeat(5))!, /at least 6/);
});

import { validateForgotPassword, validateResetPassword } from "../src/lib/auth-validation";

test("forgot password requires a well-formed email", () => {
  assert.match(validateForgotPassword({ email: "" }).email!, /Enter your email/);
  assert.match(validateForgotPassword({ email: "ada@" }).email!, /valid email/);
  assert.deepEqual(validateForgotPassword({ email: " ada@example.com " }), {});
});

test("reset password checks the password, then the confirmation", () => {
  assert.deepEqual(validateResetPassword({ password: "secret1", confirm: "secret1" }), {});
  const empty = validateResetPassword({ password: "", confirm: "" });
  assert.ok(empty.password && empty.confirm);
  // A weak password is reported alone; the mismatch waits until it is fixed.
  assert.deepEqual(Object.keys(validateResetPassword({ password: "abc", confirm: "xyz" })), ["password"]);
  assert.match(validateResetPassword({ password: "secret1", confirm: "secret2" }).confirm!, /don't match/);
  assert.match(validateResetPassword({ password: "p".repeat(26), confirm: "p".repeat(26) }).password!, /longer than 25/);
});
