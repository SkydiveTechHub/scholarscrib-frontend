import { test } from "node:test";
import assert from "node:assert/strict";
import {
  biasNote,
  calibrationApiParams,
  calibrationUrlParams,
  formatPct,
  normaliseCalibrationFilter,
  parseCalibrationReport,
  plotPoints,
  verdict,
  type Summary,
} from "../src/lib/admin-calibration";

const summary = (over: Partial<Summary> = {}): Summary => ({
  n: 500,
  baseRate: 0.6,
  meanPredicted: 0.6,
  brier: 0.2,
  logLoss: 0.6,
  baselineBrier: 0.24,
  baselineLogLoss: 0.67,
  ...over,
});

// --- filter ------------------------------------------------------------------

test("an empty query is the unfiltered view", () => {
  assert.deepEqual(normaliseCalibrationFilter({}), {
    source: null,
    scoringVersion: null,
    since: null,
  });
});

test("only the two real sources are accepted", () => {
  assert.equal(normaliseCalibrationFilter({ source: "ASSESSMENT" }).source, "ASSESSMENT");
  assert.equal(normaliseCalibrationFilter({ source: "LESSON_CHECK" }).source, "LESSON_CHECK");
  assert.equal(normaliseCalibrationFilter({ source: "PRETEST" }).source, null);
  assert.equal(normaliseCalibrationFilter({ source: "" }).source, null);
});

test("scoring version must be a positive whole number", () => {
  assert.equal(normaliseCalibrationFilter({ scoringVersion: "3" }).scoringVersion, 3);
  for (const bad of ["0", "-2", "2.5", "abc", " ", ""]) {
    assert.equal(normaliseCalibrationFilter({ scoringVersion: bad }).scoringVersion, null, bad);
  }
});

test("since is a valid date or nothing", () => {
  const found = normaliseCalibrationFilter({ since: "2026-10-01" }).since;
  assert.ok(found instanceof Date);
  assert.equal(found.toISOString().slice(0, 10), "2026-10-01");
  assert.equal(normaliseCalibrationFilter({ since: "not a date" }).since, null);
});

test("the page URL carries a date-only since and only the fields that are set", () => {
  assert.deepEqual(calibrationUrlParams(normaliseCalibrationFilter({})), {});
  assert.deepEqual(
    calibrationUrlParams(
      normaliseCalibrationFilter({ source: "ASSESSMENT", scoringVersion: "3", since: "2026-10-01" }),
    ),
    { source: "ASSESSMENT", scoringVersion: "3", since: "2026-10-01" },
  );
});

test("the API call sends the backend's parameter names and a full timestamp", () => {
  assert.deepEqual(calibrationApiParams(normaliseCalibrationFilter({})), {});
  assert.deepEqual(
    calibrationApiParams(
      normaliseCalibrationFilter({ source: "LESSON_CHECK", scoringVersion: "3", since: "2026-10-01" }),
    ),
    { source: "LESSON_CHECK", scoringVersion: "3", since: "2026-10-01T00:00:00.000Z" },
  );
});

// --- parsing -----------------------------------------------------------------

test("garbage from the backend parses to an empty report instead of throwing", () => {
  for (const bad of [null, undefined, 42, "x", [], {}]) {
    const report = parseCalibrationReport(bad);
    assert.equal(report.overall.n, 0);
    assert.deepEqual(report.buckets, []);
    assert.deepEqual(report.byDifficulty, {});
  }
});

test("a real payload is read field by field, with bad numbers defaulted", () => {
  const report = parseCalibrationReport({
    overall: { n: 120, baseRate: 0.55, meanPredicted: 0.62, brier: 0.21, logLoss: "oops" },
    buckets: [
      { lower: 0.5, upper: 0.6, n: 40, meanPredicted: 0.55, observed: 0.5, lowSample: false },
      { lower: 0.9, upper: 1, n: 0, meanPredicted: null, observed: null, lowSample: true },
    ],
    byEvidence: { belowFloor: { n: 10 }, atOrAboveFloor: { n: 110 } },
    byDifficulty: { BASIC: { n: 60 }, UNKNOWN: { n: 5 } },
  });
  assert.equal(report.overall.n, 120);
  assert.equal(report.overall.logLoss, 0);
  assert.equal(report.buckets.length, 2);
  assert.equal(report.buckets[1].observed, null);
  assert.equal(report.byEvidence.belowFloor.n, 10);
  assert.equal(report.byEvidence.atOrAboveFloor.n, 110);
  assert.deepEqual(Object.keys(report.byDifficulty).sort(), ["BASIC", "UNKNOWN"]);
});

// --- reading the numbers -----------------------------------------------------

test("no predictions yet says so", () => {
  assert.equal(verdict(summary({ n: 0 })).tone, "none");
});

test("too few predictions are not judged either way", () => {
  const found = verdict(summary({ n: 40 }));
  assert.equal(found.tone, "thin");
  assert.match(found.text, /40/);
});

test("beating the always-guess-the-average baseline is better", () => {
  assert.equal(verdict(summary({ brier: 0.18, baselineBrier: 0.24 })).tone, "better");
});

test("doing worse than the baseline is worse", () => {
  assert.equal(verdict(summary({ brier: 0.27, baselineBrier: 0.24 })).tone, "worse");
});

test("within two percent of the baseline is about equal", () => {
  assert.equal(verdict(summary({ brier: 0.2395, baselineBrier: 0.24 })).tone, "equal");
});

test("when every outcome is identical there is nothing to compare", () => {
  const found = verdict(summary({ baselineBrier: 0, brier: 0.04 }));
  assert.equal(found.tone, "thin");
});

test("bias note names the direction once the gap is five points or more", () => {
  assert.match(biasNote(summary({ meanPredicted: 0.7, baseRate: 0.55 })) ?? "", /higher/i);
  assert.match(biasNote(summary({ meanPredicted: 0.45, baseRate: 0.6 })) ?? "", /lower/i);
  assert.equal(biasNote(summary({ meanPredicted: 0.62, baseRate: 0.6 })), null);
  assert.equal(biasNote(summary({ n: 0 })), null);
});

test("percentages round and missing values dash", () => {
  assert.equal(formatPct(0.634), "63%");
  assert.equal(formatPct(0), "0%");
  assert.equal(formatPct(null), "—");
});

test("the chart plots only buckets that hold answers, on a 0-100 scale", () => {
  const points = plotPoints([
    { lower: 0, upper: 0.1, n: 0, meanPredicted: null, observed: null, lowSample: true },
    { lower: 0.5, upper: 0.6, n: 12, meanPredicted: 0.55, observed: 0.5, lowSample: true },
    { lower: 0.6, upper: 0.7, n: 80, meanPredicted: 0.65, observed: 0.7, lowSample: false },
  ]);
  assert.equal(points.length, 2);
  assert.deepEqual(
    points.map((p) => [p.x, p.y, p.n, p.lowSample]),
    [
      [55, 50, 12, true],
      [65, 70, 80, false],
    ],
  );
  assert.equal(points[0].range, "50–60%");
});
