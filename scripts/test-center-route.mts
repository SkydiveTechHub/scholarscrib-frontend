import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyCenterPath, isCenterPath } from "../src/lib/center-route";

test("center auth API paths are auth", () => {
  assert.equal(classifyCenterPath("/center/api/auth"), "auth");
  assert.equal(classifyCenterPath("/center/api/auth/login"), "auth");
  assert.equal(classifyCenterPath("/center/api/auth/session"), "auth");
});

test("center login entry paths are login", () => {
  assert.equal(classifyCenterPath("/center/login"), "login");
  assert.equal(classifyCenterPath("/center/forgot-password"), "login");
  assert.equal(classifyCenterPath("/center/reset-password"), "login");
});

test("center console paths are console", () => {
  assert.equal(classifyCenterPath("/center"), "console");
  assert.equal(classifyCenterPath("/center/roster"), "console");
  assert.equal(classifyCenterPath("/center/assignments"), "console");
  assert.equal(classifyCenterPath("/center/api/centers"), "console");
});

test("non-center paths are null", () => {
  assert.equal(classifyCenterPath("/dashboard"), null);
  assert.equal(classifyCenterPath("/login"), null);
  assert.equal(classifyCenterPath("/"), null);
  assert.equal(classifyCenterPath("/admin"), null);
});

test("prefix lookalikes are not center", () => {
  assert.equal(classifyCenterPath("/centered"), null);
  assert.equal(classifyCenterPath("/centerfoo"), null);
});

test("login-something is console, not login", () => {
  assert.equal(classifyCenterPath("/center/loginsomething"), "console");
});

test("isCenterPath rejects open redirects", () => {
  assert.equal(isCenterPath("/center"), true);
  assert.equal(isCenterPath("/center/roster"), true);
  assert.equal(isCenterPath("//evil.example"), false);
  assert.equal(isCenterPath("/centered"), false);
  assert.equal(isCenterPath("/dashboard"), false);
});
