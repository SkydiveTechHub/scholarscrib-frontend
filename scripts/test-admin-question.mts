import { test } from "node:test";
import assert from "node:assert/strict";
import { MIN_OBJECTIVE_OPTIONS, checkQuestionInvariants, normalizeOptions } from "../src/lib/admin-question";

const FOUR = { A: "one", B: "two", C: "three", D: "four" };

test("an objective question whose correct answer is a real option passes", () => {
  const issues = checkQuestionInvariants({
    questionType: "OBJECTIVE",
    options: FOUR,
    correctAnswer: "B",
  });
  assert.deepEqual(issues, []);
});

test("an objective question whose correct answer is not an option is rejected", () => {
  // The database happily stores this today, and the quiz engine then marks
  // every student wrong.
  const issues = checkQuestionInvariants({
    questionType: "OBJECTIVE",
    options: FOUR,
    correctAnswer: "E",
  });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].field, "correctAnswer");
});

test("the correct answer matches its option key case-insensitively", () => {
  const issues = checkQuestionInvariants({
    questionType: "OBJECTIVE",
    options: FOUR,
    correctAnswer: "b",
  });
  assert.deepEqual(issues, []);
});

test("an objective question needs at least four options", () => {
  const issues = checkQuestionInvariants({
    questionType: "OBJECTIVE",
    options: { A: "one", B: "two", C: "three" },
    correctAnswer: "A",
  });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].field, "options");
  assert.match(issues[0].message, new RegExp(String(MIN_OBJECTIVE_OPTIONS)));
});

test("an objective question with no options at all is rejected", () => {
  const issues = checkQuestionInvariants({
    questionType: "OBJECTIVE",
    options: null,
    correctAnswer: "A",
  });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].field, "options");
});

test("a theory question needs no options", () => {
  const issues = checkQuestionInvariants({
    questionType: "THEORY",
    options: null,
    correctAnswer: "See marking scheme",
  });
  assert.deepEqual(issues, []);
});

test("duplicate option keys are reported rather than silently collapsed", () => {
  const { issues } = normalizeOptions({ A: "one", a: "ONE", B: "two" });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].field, "options");
});

test("option keys are upper-cased and values trimmed", () => {
  const { options } = normalizeOptions({ a: "  one  ", b: "two" });
  assert.deepEqual(options, { A: "one", B: "two" });
});
