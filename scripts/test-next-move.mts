import { test } from "node:test";
import assert from "node:assert/strict";
import { pickNextMove } from "../src/lib/next-move";
import type { DashboardSession, DashboardSessionItem } from "../src/lib/api/types";

const subjects = { s1: { slug: "physics", name: "Physics", code: "PHY" } };

function item(over: Partial<DashboardSessionItem> = {}): DashboardSessionItem {
  return {
    id: "i1",
    kind: "PRACTICE",
    source: "ENGINE",
    topicId: "t1",
    subjectId: "s1",
    title: "Motion",
    slug: "motion",
    minutes: 12,
    reason: "Your recent answers here were mixed.",
    doneAt: null,
    lessonId: null,
    dueCards: 0,
    planItemId: null,
    activityType: null,
    mastery: null,
    retention: null,
    retentionSource: null,
    evidenceLevel: "ENOUGH",
    ...over,
  } as DashboardSessionItem;
}

const session = (items: DashboardSessionItem[]): DashboardSession => ({
  minutes: 30,
  done: items.filter((i) => i.doneAt).length,
  total: items.length,
  items,
});

test("a brand-new student gets a generic starter that does not claim to be personal", () => {
  const move = pickNextMove(null, subjects, false);
  assert.equal(move.kind, "generic");
  assert.equal(move.href, "/practice");
  assert.equal(move.minutes, null);
  assert.doesNotMatch(move.reason, /your (recent|weak|progress)/i);
});

test("the first unfinished item with a destination is the move", () => {
  const s = session([
    item({ id: "a", doneAt: "2026-10-28T08:00:00Z", title: "Done one" }),
    item({ id: "b", title: "Forces", slug: "forces" }),
    item({ id: "c", title: "Energy", slug: "energy" }),
  ]);
  const move = pickNextMove(s, subjects, true);
  assert.equal(move.kind, "personalized");
  assert.equal(move.title, "Forces");
  assert.equal(move.href, "/classroom/physics/forces/practice");
  assert.equal(move.minutes, 12);
  assert.equal(move.reason, "Your recent answers here were mixed.");
});

test("an item that cannot be opened is skipped, not shown as a dead button", () => {
  const s = session([
    item({ id: "a", subjectId: "gone", title: "Orphan" }),
    item({ id: "b", title: "Waves", slug: "waves" }),
  ]);
  assert.equal(pickNextMove(s, subjects, true).title, "Waves");
});

test("due flashcards send the student to flashcards", () => {
  const s = session([item({ kind: "RETRIEVE", dueCards: 6, title: "Motion" })]);
  const move = pickNextMove(s, subjects, true);
  assert.equal(move.href, "/flashcards");
  assert.equal(move.cta, "Review cards");
});

test("when today is finished the card says so and offers something optional", () => {
  const s = session([item({ doneAt: "2026-10-28T08:00:00Z" })]);
  const move = pickNextMove(s, subjects, true);
  assert.equal(move.kind, "done");
  assert.match(move.title, /done/i);
  assert.equal(move.minutes, null);
  assert.ok(move.href.startsWith("/"));
});

test("an empty session with activity falls back to the generic move", () => {
  assert.equal(pickNextMove(session([]), subjects, true).kind, "generic");
});

test("unopenable work only falls back to the generic move", () => {
  const s = session([item({ subjectId: "gone" })]);
  assert.equal(pickNextMove(s, subjects, true).kind, "generic");
});

test("no copy pressures or shames the student", () => {
  const moves = [
    pickNextMove(null, subjects, false),
    pickNextMove(session([item()]), subjects, true),
    pickNextMove(session([item({ doneAt: "2026-10-28T08:00:00Z" })]), subjects, true),
  ];
  for (const m of moves) {
    assert.doesNotMatch(`${m.title} ${m.reason}`, /hurry|last chance|don't miss|falling behind|lazy/i);
  }
});
