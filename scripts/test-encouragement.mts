import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ENCOURAGEMENTS,
  IDLE_LIMIT_MS,
  isAssessmentPath,
  isIdleGap,
  pickEncouragement,
} from "../src/lib/encouragement";

const NOW = 1_770_000_000_000;

test("the idle limit is thirty minutes", () => {
  assert.equal(IDLE_LIMIT_MS, 30 * 60 * 1000);
});

test("a gap at or beyond the limit counts as idle", () => {
  assert.equal(isIdleGap(NOW - IDLE_LIMIT_MS, NOW), true);
  assert.equal(isIdleGap(NOW - IDLE_LIMIT_MS - 1, NOW), true);
});

test("a gap shorter than the limit does not", () => {
  assert.equal(isIdleGap(NOW - IDLE_LIMIT_MS + 1, NOW), false);
});

test("no recorded activity is not idle", () => {
  assert.equal(isIdleGap(null, NOW), false);
  assert.equal(isIdleGap(Number.NaN, NOW), false);
});

test("exam and quiz surfaces are assessment paths", () => {
  assert.equal(isAssessmentPath("/practice/cbt/session"), true);
  assert.equal(isAssessmentPath("/practice/mock-exam/session"), true);
  assert.equal(isAssessmentPath("/classroom/maths/algebra/quiz"), true);
  assert.equal(isAssessmentPath("/classroom/maths/algebra/practice"), true);
});

test("other dashboard pages are not", () => {
  assert.equal(isAssessmentPath("/dashboard"), false);
  assert.equal(isAssessmentPath("/practice/cbt"), false);
  assert.equal(isAssessmentPath("/classroom/maths/algebra/study"), false);
  assert.equal(
    isAssessmentPath("/classroom/maths/algebra/practice/result"),
    false,
  );
  assert.equal(isAssessmentPath("/practice/results/42"), false);
});

test("pickEncouragement never repeats the previous message", () => {
  for (let prev = 0; prev < ENCOURAGEMENTS.length; prev++) {
    const { index } = pickEncouragement(
      prev,
      () => prev / ENCOURAGEMENTS.length,
    );
    assert.notEqual(index, prev);
  }
});

test("pickEncouragement stays in range at the extremes", () => {
  assert.equal(pickEncouragement(null, () => 0).index, 0);
  assert.equal(
    pickEncouragement(null, () => 0.999999).index,
    ENCOURAGEMENTS.length - 1,
  );
});
