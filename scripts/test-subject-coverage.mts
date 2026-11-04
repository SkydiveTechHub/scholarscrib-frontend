import { test } from "node:test";
import assert from "node:assert/strict";
import type { CatalogueSubjectOut } from "../src/lib/api/types";
import { isTrackSubject, subjectsForExam, yearsForExam } from "../src/lib/subject-coverage";

function subject(
  slug: string,
  category: string,
  examTypes: string[] = ["jamb"],
): CatalogueSubjectOut {
  return { slug, name: slug, displayName: slug, category, examTypes };
}

const physics = subject("physics", "SCIENCE");
const accounting = subject("accounting", "COMMERCIAL");
const literature = subject("literature-in-english", "ARTS");
const english = subject("english-language", "CORE");
const maths = subject("mathematics", "CORE");

test("keeps only subjects offered for the exam, sorted by name", () => {
  const list = [
    subject("physics", "SCIENCE", ["jamb"]),
    subject("civic-education", "CORE", ["neco", "waec"]),
    subject("accounting", "COMMERCIAL", ["jamb", "waec"]),
  ];
  assert.deepEqual(
    subjectsForExam(list, "waec").map((s) => s.slug),
    ["accounting", "civic-education"],
  );
  assert.deepEqual(subjectsForExam(list, "neco").map((s) => s.slug), ["civic-education"]);
});

test("science students see sciences only, plus core subjects", () => {
  assert.equal(isTrackSubject(physics, "SCIENCE"), true);
  assert.equal(isTrackSubject(maths, "SCIENCE"), true);
  assert.equal(isTrackSubject(english, "SCIENCE"), true);
  assert.equal(isTrackSubject(accounting, "SCIENCE"), false);
  assert.equal(isTrackSubject(literature, "SCIENCE"), false);
});

test("core subjects are compulsory on every track", () => {
  assert.equal(isTrackSubject(maths, "ARTS"), true);
  assert.equal(isTrackSubject(maths, "COMMERCIAL"), true);
  assert.equal(isTrackSubject(literature, "ARTS"), true);
  assert.equal(isTrackSubject(literature, "COMMERCIAL"), false);
  assert.equal(isTrackSubject(accounting, "COMMERCIAL"), true);
});

test("no track or an unknown track shows everything", () => {
  for (const track of [null, undefined, "", "ASTRONOMY"]) {
    assert.equal(isTrackSubject(accounting, track), true);
    assert.equal(isTrackSubject(physics, track), true);
  }
});

test("years are newest first and keep unknown counts", () => {
  const years = [
    { year: 2010, questionCount: 40, cached: true },
    { year: 2013, questionCount: null, cached: false },
    { year: 2011, questionCount: 0, cached: false },
    { year: 2012, questionCount: 50, cached: true },
  ];
  assert.deepEqual(yearsForExam(years), [
    { year: 2013, questionCount: null },
    { year: 2012, questionCount: 50 },
    { year: 2010, questionCount: 40 },
  ]);
});
