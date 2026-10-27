import { test } from "node:test";
import assert from "node:assert/strict";
import { hasWarning, practiceWarnings } from "../src/lib/practice-warnings";

const physics = { name: "physics", category: "sciences", label: "Physics" };
const economics = { name: "economics", category: "commercial", label: "Economics" };
const english = { name: "english-language", category: "languages", label: "English" };

test("SS1 and SS2 get the class warning, SS3 does not", () => {
  for (const classLevel of ["SS1", "SS2"]) {
    assert.equal(practiceWarnings({ classLevel, track: "SCIENCE", subjects: [physics] }).beyondClass, true);
  }
  assert.equal(practiceWarnings({ classLevel: "SS3", track: "SCIENCE", subjects: [physics] }).beyondClass, false);
  assert.equal(practiceWarnings({ classLevel: null, track: "SCIENCE", subjects: [physics] }).beyondClass, false);
});

test("a subject outside the track is flagged by name", () => {
  const w = practiceWarnings({ classLevel: "SS3", track: "SCIENCE", subjects: [economics, physics] });
  assert.equal(w.offTrack, true);
  assert.deepEqual(w.offTrackSubjects, ["Economics"]);
});

test("compulsory subjects and trackless students are never off-track", () => {
  assert.equal(practiceWarnings({ classLevel: "SS3", track: "SCIENCE", subjects: [english] }).offTrack, false);
  assert.equal(practiceWarnings({ classLevel: "SS3", track: null, subjects: [economics] }).offTrack, false);
});

test("checkClass false skips the class warning", () => {
  const w = practiceWarnings({ classLevel: "SS1", track: "SCIENCE", subjects: [economics], checkClass: false });
  assert.equal(w.beyondClass, false);
  assert.equal(w.offTrack, true);
  assert.equal(hasWarning(w), true);
});
