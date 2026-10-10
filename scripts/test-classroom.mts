import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mockExamHrefFor,
  resolveClassLevel,
  selectResources,
  toNotes,
  type TopicNavItem,
} from "../src/lib/classroom";
import type { LessonBlock } from "../src/lib/lesson-engine";

const concept = (id: string): LessonBlock => ({
  type: "concept",
  id,
  title: `Concept ${id}`,
  text: "Body text",
});
const check = (id: string): LessonBlock => ({
  type: "check",
  id,
  question: "Q?",
  options: { A: "a", B: "b" },
  answer: "A",
  explanation: "because",
  afterCard: "c1",
});

// ─── toNotes ───────────────────────────────────────────────

test("toNotes drops check blocks", () => {
  // A knowledge check belongs to the player, where an answer is graded.
  const notes = toNotes([concept("c1"), check("k1"), concept("c2")]);
  assert.deepEqual(notes.map((b) => b.id), ["c1", "c2"]);
});

test("toNotes preserves authored order", () => {
  const notes = toNotes([concept("c3"), concept("c1"), concept("c2")]);
  assert.deepEqual(notes.map((b) => b.id), ["c3", "c1", "c2"]);
});

test("toNotes keeps every non-check type", () => {
  const blocks: LessonBlock[] = [
    concept("c"),
    { type: "diagram", id: "d", svg: "<svg/>", hotspots: [] },
    { type: "example", id: "e", problem: "p", steps: ["s"], answer: "a" },
    { type: "tip", id: "t", text: "tip" },
    { type: "mistake", id: "m", wrong: "w", right: "r" },
    { type: "mnemonic", id: "n", phrase: "p", encoded: ["e"] },
    { type: "short", id: "s", question: "q", answer: "a" },
  ];
  assert.equal(toNotes(blocks).length, 7);
});

test("toNotes on an empty list returns empty", () => {
  assert.deepEqual(toNotes([]), []);
});

test("toNotes on checks only returns empty", () => {
  assert.deepEqual(toNotes([check("k1"), check("k2")]), []);
});

// ─── resolveClassLevel ─────────────────────────────────────

test("resolveClassLevel honours the student's own class", () => {
  assert.equal(resolveClassLevel("SS2", ["SS1", "SS2", "SS3"]), "SS2");
});

test("resolveClassLevel falls back when the student's class has no topics", () => {
  assert.equal(resolveClassLevel("SS3", ["SS1", "SS2"]), "SS1");
});

test("resolveClassLevel falls back for junior, absent and unknown values", () => {
  for (const value of ["JSS3", null, undefined, "", "SS4"]) {
    assert.equal(resolveClassLevel(value, ["SS2", "SS3"]), "SS2", `value=${value}`);
  }
});

test("resolveClassLevel returns SS1 when no class has topics", () => {
  assert.equal(resolveClassLevel(null, []), "SS1");
});

test("resolveClassLevel picks the lowest available class, not list order", () => {
  assert.equal(resolveClassLevel(null, ["SS3", "SS1"]), "SS1");
});

// ─── topicNeighbours ───────────────────────────────────────

const topic = (
  slug: string,
  classLevel: string,
  term: string,
  orderIndex: number,
): TopicNavItem => ({ slug, title: slug, classLevel, term, orderIndex });

const SYLLABUS: TopicNavItem[] = [
  topic("a", "SS1", "FIRST", 0),
  topic("b", "SS1", "FIRST", 1),
  topic("c", "SS1", "SECOND", 0),
  topic("d", "SS1", "THIRD", 0),
  topic("e", "SS2", "FIRST", 0),
];

// ─── selectResources ───────────────────────────────────────

test("selectResources prefers topic resources", () => {
  const result = selectResources(["lesson-a"], ["subject-a", "subject-b"]);
  assert.equal(result.source, "topic");
  assert.deepEqual(result.items, ["lesson-a"]);
});

test("selectResources falls back to subject resources", () => {
  const result = selectResources([], ["subject-a"]);
  assert.equal(result.source, "subject");
  assert.deepEqual(result.items, ["subject-a"]);
});

test("selectResources reports none when both are empty", () => {
  const result = selectResources([], []);
  assert.equal(result.source, "none");
  assert.deepEqual(result.items, []);
});

// ─── mockExamHrefFor ───────────────────────────────────────
//
// This is the contract between the Classroom practice CTA and the mock-exam
// picker's deep-link parser. They were built in different tasks and must agree
// on the parameter names; nothing else pins that.

test("mockExamHrefFor targets the mock exam picker", () => {
  const href = mockExamHrefFor({ subjectId: "sub_1", classLevel: "SS2" });
  assert.ok(href.startsWith("/practice/mock-exam?"));
});

test("mockExamHrefFor carries the exact params the picker reads", () => {
  const href = mockExamHrefFor({ subjectId: "sub_1", classLevel: "SS2" });
  const params = new URLSearchParams(href.split("?")[1]);
  assert.equal(params.get("subjectId"), "sub_1");
  assert.equal(params.get("fromClass"), "SS2");
  assert.equal(params.get("fromTerm"), "FIRST");
  assert.equal(params.get("toClass"), "SS2");
  assert.equal(params.get("toTerm"), "THIRD");
});

test("mockExamHrefFor spans the whole class year", () => {
  // First term to third term — the picker renders this as "all of SS1".
  const params = new URLSearchParams(
    mockExamHrefFor({ subjectId: "s", classLevel: "SS1" }).split("?")[1],
  );
  assert.equal(params.get("fromClass"), params.get("toClass"));
  assert.equal(params.get("fromTerm"), "FIRST");
  assert.equal(params.get("toTerm"), "THIRD");
});

test("mockExamHrefFor varies by class level", () => {
  const ss1 = mockExamHrefFor({ subjectId: "s", classLevel: "SS1" });
  const ss3 = mockExamHrefFor({ subjectId: "s", classLevel: "SS3" });
  assert.notEqual(ss1, ss3);
});

test("mockExamHrefFor encodes a subject id containing url-unsafe characters", () => {
  // cuids are url-safe, but building the query by concatenation would silently
  // break the day an id isn't.
  const href = mockExamHrefFor({ subjectId: "a b&c=d", classLevel: "SS1" });
  const params = new URLSearchParams(href.split("?")[1]);
  assert.equal(params.get("subjectId"), "a b&c=d");
});
