import { test } from "node:test";
import assert from "node:assert/strict";
import {
  achievementState,
  availableCategories,
  categoryOf,
  countByState,
  filterByCategory,
  filterByState,
  upNext,
  nextStep,
  type CardInput,
} from "../src/lib/achievements-ui";

const card = (over: Partial<CardInput> = {}): CardInput => ({
  id: "a",
  title: "Century Club",
  criteriaType: "questions_answered",
  category: "practice",
  progress: 0,
  target: 100,
  earned: false,
  ...over,
});

test("an earned badge is earned whatever its progress", () => {
  assert.equal(achievementState(card({ earned: true, progress: 100 })), "earned");
});

test("a badge with some progress is in progress", () => {
  assert.equal(achievementState(card({ progress: 37 })), "in-progress");
});

test("a badge with no progress is locked", () => {
  assert.equal(achievementState(card({ progress: 0 })), "locked");
});

test("the category comes from the server when it is a known one", () => {
  assert.equal(categoryOf(card({ category: "revision" })), "revision");
});

test("a missing or unknown category falls back to practice", () => {
  assert.equal(categoryOf(card({ category: undefined })), "practice");
  assert.equal(categoryOf(card({ category: "mystery" })), "practice");
});

test("question badges point at practice with the remaining count", () => {
  const step = nextStep(card({ progress: 37 }));
  assert.equal(step?.text, "Answer 63 more questions.");
  assert.equal(step?.href, "/practice");
});

test("one question left is singular", () => {
  assert.equal(nextStep(card({ progress: 99 }))?.text, "Answer 1 more question.");
});

test("streak badges ask for study today, not an app open", () => {
  const step = nextStep(
    card({ criteriaType: "streak_days", category: "consistency", progress: 2, target: 7 }),
  );
  assert.match(step?.text ?? "", /5 more days/);
  assert.match(step?.text ?? "", /study/i);
});

test("flashcard badges point at flashcards", () => {
  const step = nextStep(
    card({ criteriaType: "cards_reviewed", category: "revision", progress: 10, target: 50 }),
  );
  assert.equal(step?.href, "/flashcards");
  assert.match(step?.text ?? "", /40 more flashcards/);
});

test("an earned badge has no next step", () => {
  assert.equal(nextStep(card({ earned: true, progress: 100 })), null);
});

test("an unknown criterion gets no invented next step", () => {
  assert.equal(nextStep(card({ criteriaType: "something_new" })), null);
});

test("only categories that have badges are offered as filters", () => {
  const cats = availableCategories([
    card({ category: "practice" }),
    card({ id: "b", category: "revision" }),
  ]);
  assert.deepEqual(cats.map((c) => c.id), ["practice", "revision"]);
});

test("filtering keeps the original order and 'all' keeps everything", () => {
  const list = [
    card({ id: "a", category: "practice" }),
    card({ id: "b", category: "revision" }),
    card({ id: "c", category: "practice" }),
  ];
  assert.deepEqual(filterByCategory(list, "practice").map((c) => c.id), ["a", "c"]);
  assert.equal(filterByCategory(list, "all").length, 3);
});

test("improvement is a category and is offered when a badge uses it", () => {
  const cats = availableCategories([card({ category: "improvement" })]);
  assert.deepEqual(cats.map((c) => c.id), ["improvement"]);
  assert.equal(categoryOf(card({ category: "improvement" })), "improvement");
});

test("correction badges explain how to earn them without shaming", () => {
  const step = nextStep(
    card({ criteriaType: "questions_corrected", category: "improvement", progress: 4, target: 10 }),
  );
  assert.match(step?.text ?? "", /6 more/);
  assert.match(step?.text ?? "", /earlier day/);
  assert.doesNotMatch(step?.text ?? "", /wrong|fail|mistake/i);
  assert.equal(step?.href, "/practice");
});

test("the mock improvement badge points at mock exams", () => {
  const step = nextStep(
    card({ criteriaType: "mock_improvement", category: "exam_readiness", progress: 0, target: 1 }),
  );
  assert.equal(step?.href, "/practice/mock-exam");
  assert.match(step?.text ?? "", /mock/i);
});

test("badges are counted by state", () => {
  const counts = countByState([
    card({ id: "a", earned: true, progress: 100 }),
    card({ id: "b", progress: 5 }),
    card({ id: "c", progress: 0 }),
    card({ id: "d", progress: 0 }),
  ]);
  assert.deepEqual(counts, { earned: 1, "in-progress": 1, locked: 2 });
});

test("filtering by state keeps order and 'all' keeps everything", () => {
  const list = [
    card({ id: "a", progress: 5 }),
    card({ id: "b", earned: true, progress: 100 }),
    card({ id: "c", progress: 9 }),
  ];
  assert.deepEqual(filterByState(list, "in-progress").map((c) => c.id), ["a", "c"]);
  assert.equal(filterByState(list, "all").length, 3);
});

test("up next lists in-progress badges closest to done, capped", () => {
  const list = [
    card({ id: "a", progress: 10, target: 100 }),
    card({ id: "b", progress: 90, target: 100 }),
    card({ id: "c", earned: true, progress: 100 }),
    card({ id: "d", progress: 0 }),
    card({ id: "e", progress: 50, target: 100 }),
    card({ id: "f", progress: 20, target: 100 }),
  ];
  assert.deepEqual(upNext(list).map((c) => c.id), ["b", "e", "f"]);
  assert.deepEqual(upNext(list, 1).map((c) => c.id), ["b"]);
});
