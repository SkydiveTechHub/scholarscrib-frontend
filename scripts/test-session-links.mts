import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sessionActionLabel,
  sessionItemHref,
  sessionKindLabel,
} from "../src/lib/session-links";
import type { DashboardSessionItem } from "../src/lib/api/types";

const subjects = { s1: { slug: "physics", name: "Physics", code: "PHY" } };

function item(overrides: Partial<DashboardSessionItem>): DashboardSessionItem {
  return {
    id: "x",
    kind: "PRACTICE",
    source: "ENGINE",
    topicId: "t1",
    subjectId: "s1",
    title: "Gas laws",
    slug: "gas-laws",
    minutes: 8,
    reason: "r",
    doneAt: null,
    lessonId: null,
    dueCards: 0,
    planItemId: null,
    activityType: null,
    mastery: 40,
    retention: null,
    retentionSource: null,
    evidenceLevel: "ENOUGH",
    confidence: 0.6,
    accObservations: 8,
    lessonObservations: 0,
    srsObservations: 0,
    lastStudy: null,
    ...overrides,
  };
}

test("practice links to the topic practice page", () => {
  assert.equal(
    sessionItemHref(item({}), subjects),
    "/classroom/physics/gas-laws/practice",
  );
});

test("retrieve with due cards goes to flashcards, without goes to practice", () => {
  assert.equal(
    sessionItemHref(item({ kind: "RETRIEVE", dueCards: 3 }), subjects),
    "/flashcards",
  );
  assert.equal(
    sessionItemHref(item({ kind: "RETRIEVE", dueCards: 0 }), subjects),
    "/classroom/physics/gas-laws/practice",
  );
});

test("continue resumes in the lesson player; learn opens the topic", () => {
  assert.equal(
    sessionItemHref(item({ kind: "CONTINUE", lessonId: "l1" }), subjects),
    "/classroom/physics/gas-laws/study",
  );
  assert.equal(
    sessionItemHref(item({ kind: "LEARN" }), subjects),
    "/classroom/physics/gas-laws",
  );
});

test("mock exam and past questions link to their practice pages", () => {
  const base = { topicId: null, slug: null, title: "Mock exam" };
  assert.equal(
    sessionItemHref(item({ ...base, kind: "MOCK" }), subjects),
    "/practice/mock-exam",
  );
  assert.equal(
    sessionItemHref(item({ ...base, kind: "PAST" }), subjects),
    "/practice/past-questions/physics",
  );
  assert.equal(
    sessionItemHref(item({ ...base, kind: "PAST", subjectId: null }), subjects),
    "/practice/past-questions",
  );
});

test("a topic item whose subject is unknown has no link", () => {
  assert.equal(sessionItemHref(item({ subjectId: "gone" }), subjects), null);
  assert.equal(sessionItemHref(item({ slug: null }), subjects), null);
});

test("labels", () => {
  assert.equal(sessionActionLabel(item({ kind: "RETRIEVE", dueCards: 2 })), "Review cards");
  assert.equal(sessionActionLabel(item({ kind: "RETRIEVE" })), "Refresh");
  assert.equal(sessionActionLabel(item({ kind: "PRACTICE" })), "Practise");
  assert.equal(sessionActionLabel(item({ kind: "CONTINUE" })), "Continue");
  assert.equal(sessionActionLabel(item({ kind: "LEARN" })), "Start lesson");
  assert.equal(sessionActionLabel(item({ kind: "MOCK" })), "Start");
  assert.equal(sessionKindLabel(item({ kind: "RETRIEVE" })), "Revise");
  assert.equal(sessionKindLabel(item({ kind: "PRACTICE" })), "Practise");
  assert.equal(sessionKindLabel(item({ kind: "CONTINUE" })), "Continue");
  assert.equal(sessionKindLabel(item({ kind: "LEARN" })), "New");
  assert.equal(sessionKindLabel(item({ kind: "MOCK" })), "Mock exam");
  assert.equal(sessionKindLabel(item({ kind: "PAST" })), "Past questions");
});
