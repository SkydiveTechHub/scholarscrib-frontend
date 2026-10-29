import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MOCK_EXAM_MIN_QUESTIONS,
  scopedMockExamCount,
} from "../src/lib/mock-exam";

test("the API minimum is five questions", () => {
  assert.equal(MOCK_EXAM_MIN_QUESTIONS, 5);
});

test("a scope thinner than the minimum is not a paper", () => {
  assert.equal(scopedMockExamCount(20, 0), null);
  assert.equal(scopedMockExamCount(20, 1), null);
  assert.equal(scopedMockExamCount(40, 4), null);
  assert.equal(scopedMockExamCount(4, 4), null);
});

test("a requested count under the minimum is refused even when the scope is full", () => {
  assert.equal(scopedMockExamCount(4, 40), null);
  assert.equal(scopedMockExamCount(Number.NaN, 40), null);
});

test("the request is capped at what the scope holds once the minimum is met", () => {
  assert.equal(scopedMockExamCount(40, 8), 8);
  assert.equal(scopedMockExamCount(20, 5), 5);
  assert.equal(scopedMockExamCount(20, 20), 20);
  assert.equal(scopedMockExamCount(60, 100), 60);
});
