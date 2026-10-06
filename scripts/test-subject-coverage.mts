import { test } from "node:test";
import assert from "node:assert/strict";
import type { CoverageSubjectOut } from "../src/lib/api/types";
import {
  coverageYears,
  isTrackSubject,
  subjectsForExam,
} from "../src/lib/subject-coverage";

function subject(
  name: string,
  category: string,
  examTypes: string[] = ["jamb"],
  yearRange = { min: 2010, max: 2012 },
): CoverageSubjectOut {
  return {
    name,
    displayName: name,
    code: name.slice(0, 3).toUpperCase(),
    category,
    aliases: [],
    questionCount: 10,
    features: { hasPassages: false, hasEquations: false, hasDiagrams: false },
    examTypes,
    yearRange,
  };
}

const physics = subject("physics", "sciences");
const accounting = subject("accounting", "commercial");
const government = subject("government", "social-sciences");
const literature = subject("literature-in-english", "arts");
const english = subject("english-language", "languages");
const maths = subject("mathematics", "sciences");

test("keeps only subjects offered for the exam, sorted by name", () => {
  const list = [
    subject("physics", "sciences", ["jamb", "post_utme"]),
    subject("civic-education", "social-sciences", ["neco", "waec"]),
    subject("accounting", "commercial", ["jamb", "waec"]),
  ];
  assert.deepEqual(
    subjectsForExam(list, "waec").map((s) => s.name),
    ["accounting", "civic-education"],
  );
  assert.deepEqual(subjectsForExam(list, "neco").map((s) => s.name), ["civic-education"]);
});

test("science students see sciences only, plus English and Maths", () => {
  assert.equal(isTrackSubject(physics, "SCIENCE"), true);
  assert.equal(isTrackSubject(maths, "SCIENCE"), true);
  assert.equal(isTrackSubject(english, "SCIENCE"), true);
  assert.equal(isTrackSubject(accounting, "SCIENCE"), false);
  assert.equal(isTrackSubject(government, "SCIENCE"), false);
});

test("social sciences sit on both Arts and Commercial", () => {
  assert.equal(isTrackSubject(government, "ARTS"), true);
  assert.equal(isTrackSubject(government, "COMMERCIAL"), true);
  assert.equal(isTrackSubject(literature, "ARTS"), true);
  assert.equal(isTrackSubject(literature, "COMMERCIAL"), false);
  assert.equal(isTrackSubject(accounting, "COMMERCIAL"), true);
});

test("maths is compulsory even outside the sciences", () => {
  assert.equal(isTrackSubject(maths, "ARTS"), true);
  assert.equal(isTrackSubject(maths, "COMMERCIAL"), true);
});

test("no track or an unknown track shows everything", () => {
  for (const track of [null, undefined, "", "ASTRONOMY"]) {
    assert.equal(isTrackSubject(accounting, track), true);
    assert.equal(isTrackSubject(physics, track), true);
  }
});

test("years run from max down to min", () => {
  assert.deepEqual(coverageYears(subject("x", "arts", ["jamb"], { min: 2010, max: 2013 })), [
    2013, 2012, 2011, 2010,
  ]);
  assert.deepEqual(coverageYears(subject("x", "arts", ["jamb"], { min: 2013, max: 2013 })), [2013]);
});

test("a malformed range yields no years", () => {
  assert.deepEqual(coverageYears(subject("x", "arts", ["jamb"], { min: 2015, max: 2010 })), []);
});
