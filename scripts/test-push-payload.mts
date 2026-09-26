import { test } from "node:test";
import assert from "node:assert/strict";
import { BODY_MAX, TITLE_MAX, isInternalPath } from "../src/lib/push-payload";

test("internal paths are accepted", () => {
  for (const url of ["/", "/study-plan", "/classroom/biology?tab=notes", "/flashcards#due"]) {
    assert.equal(isInternalPath(url), true, url);
  }
});

test("anything that could leave the origin is rejected", () => {
  for (const url of [
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
    "study-plan",
    "/ spaced",
    "",
    null,
    42,
    "/" + "a".repeat(600),
  ]) {
    assert.equal(isInternalPath(url), false, String(url));
  }
});
