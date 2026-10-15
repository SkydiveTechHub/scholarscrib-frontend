import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultScope, needsClassPrompt, scopeHeader } from "../src/lib/study-plan-scope";

test("defaultScope uses the profile class and the current term", () => {
  assert.deepEqual(defaultScope("SS2", "SECOND"), { classLevel: "SS2", term: "SECOND" });
});

test("defaultScope falls back to SS1 and FIRST", () => {
  assert.deepEqual(defaultScope(null, null), { classLevel: "SS1", term: "FIRST" });
});

test("needsClassPrompt only fires when the class really differs", () => {
  assert.equal(needsClassPrompt("SS2", "SS1"), true);
  assert.equal(needsClassPrompt("SS1", "SS1"), false);
  assert.equal(needsClassPrompt("SS2", null), false);
});

test("scopeHeader shows the week of term only while following the calendar", () => {
  assert.equal(
    scopeHeader({ classLevel: "SS1", term: "FIRST" }, true, "1st term · Week 6 of 12"),
    "SS1 · 1st term · Week 6 of 12",
  );
  assert.equal(
    scopeHeader({ classLevel: "SS2", term: "SECOND" }, false, "1st term · Week 6 of 12"),
    "SS2 · 2nd term",
  );
});
