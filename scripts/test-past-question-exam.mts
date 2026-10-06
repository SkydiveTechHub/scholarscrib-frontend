import { test } from "node:test";
import assert from "node:assert/strict";
import type { BankQuestionOut } from "../src/lib/api/types";
import {
  nextPageCursor,
  normaliseOptions,
  toExamQuestion,
} from "../src/lib/past-question-exam";

function q(id: string, correctAnswer: string | null, marks = 1): BankQuestionOut {
  return {
    id,
    questionText: `Question ${id}`,
    options: { a: "One", b: "Two", c: "Three", d: "Four" },
    correctAnswer,
    explanation: `Because ${id}`,
    marks,
    examType: "jamb",
    examYear: 2010,
  };
}


test("options keyed a–e come out upper-case", () => {
  assert.deepEqual(normaliseOptions({ a: "One", b: "Two" }), { A: "One", B: "Two" });
});

test("a bare option list is lettered in order", () => {
  assert.deepEqual(normaliseOptions(["One", "Two", "Three"]), {
    A: "One",
    B: "Two",
    C: "Three",
  });
});

test("blank padding options are dropped, and no options at all is null", () => {
  assert.deepEqual(normaliseOptions({ a: "One", b: "Two", e: "" }), { A: "One", B: "Two" });
  assert.equal(normaliseOptions(null), null);
  assert.equal(normaliseOptions({ a: "  " }), null);
});

test("object options read their text", () => {
  assert.deepEqual(normaliseOptions([{ text: "One" }, { value: "Two" }]), {
    A: "One",
    B: "Two",
  });
});

test("an exam question never carries the answer key", () => {
  const question = toExamQuestion(q("1", "A"), 0);
  assert.equal("correctAnswer" in question, false);
  assert.equal(question.questionNumber, 1);
  assert.deepEqual(question.options, { A: "One", B: "Two", C: "Three", D: "Four" });
});

test("a comprehension question carries its passage", () => {
  const question = toExamQuestion(
    { ...q("1", "A"), hasPassage: true, passage: "  The farmer rose early.  " },
    0,
  );
  assert.equal(question.passage, "The farmer rose early.");
});

test("no passage unless the question is flagged as having one", () => {
  assert.equal(toExamQuestion(q("1", "A"), 0).passage, null);
  assert.equal(toExamQuestion({ ...q("1", "A"), passage: "Stray text" }, 0).passage, null);
  assert.equal(toExamQuestion({ ...q("1", "A"), hasPassage: true, passage: "  " }, 0).passage, null);
});

test("a grouped question carries its instruction; a passage question does not", () => {
  const instruction = "Select the option that best explains the sentence.";
  assert.equal(toExamQuestion({ ...q("1", "A"), instruction }, 0).instruction, instruction);
  assert.equal(
    toExamQuestion({ ...q("1", "A"), hasPassage: true, passage: "Text", instruction }, 0).instruction,
    null,
  );
  assert.equal(toExamQuestion(q("1", "A"), 0).instruction, null);
});

test("nextPageCursor follows hasMore and nextCursor", () => {
  assert.equal(nextPageCursor({ page: 1, limit: 15, hasMore: true, nextCursor: "c2" }), "c2");
  assert.equal(nextPageCursor({ page: 1, limit: 15, has_more: true, next_cursor: "c2" }), "c2");
});

test("nextPageCursor is null when the paper is done or the cursor is missing", () => {
  assert.equal(nextPageCursor({ page: 1, limit: 15, hasMore: false, nextCursor: "c2" }), null);
  assert.equal(nextPageCursor({ page: 1, limit: 15, hasMore: true, nextCursor: null }), null);
  assert.equal(nextPageCursor({ page: 1, limit: 15 }), null);
  assert.equal(nextPageCursor(undefined), null);
});
