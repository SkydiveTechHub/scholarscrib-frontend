/**
 * Reading the mastery engine's calibration report. Pure, so the filter, the
 * parsing and the plain-language verdict can be tested without a backend.
 *
 * The backend scores every logged prediction (what the engine expected of a
 * student just before they answered) against what happened. This module turns
 * that into something an admin can read: is the engine better than guessing
 * the average, and does its score match reality?
 */

export const CALIBRATION_SOURCES = ["ASSESSMENT", "LESSON_CHECK"] as const;
export type CalibrationSource = (typeof CALIBRATION_SOURCES)[number];

export const SOURCE_LABELS: Record<CalibrationSource, string> = {
  ASSESSMENT: "Exams and practice papers",
  LESSON_CHECK: "Lesson checks",
};

/** Mirrors the backend: a bucket with fewer answers than this is flagged. */
export const LOW_SAMPLE = 30;
/** Below this many predictions the report is not judged either way. */
export const MIN_FOR_VERDICT = 100;
/** Within this share of the baseline counts as "about the same". */
const EQUAL_BAND = 0.02;
/** Average score and real rate this far apart earns a plain-language note. */
const BIAS_GAP = 0.05;

// --- filter ------------------------------------------------------------------

export interface RawCalibrationParams {
  source?: string;
  scoringVersion?: string;
  since?: string;
}

export interface CalibrationFilter {
  source: CalibrationSource | null;
  scoringVersion: number | null;
  since: Date | null;
}

export function normaliseCalibrationFilter(raw: RawCalibrationParams): CalibrationFilter {
  const source = CALIBRATION_SOURCES.find((candidate) => candidate === raw.source) ?? null;
  const version = raw.scoringVersion?.trim() ?? "";
  const parsedVersion = /^\d+$/.test(version) ? Number(version) : null;
  const sinceText = raw.since?.trim() ?? "";
  const parsedSince = sinceText ? new Date(sinceText) : null;
  return {
    source,
    scoringVersion: parsedVersion && parsedVersion > 0 ? parsedVersion : null,
    since: parsedSince && !Number.isNaN(parsedSince.getTime()) ? parsedSince : null,
  };
}

/** Query string for this page's own URL. A date-only `since` keeps it readable. */
export function calibrationUrlParams(filter: CalibrationFilter): Record<string, string> {
  return {
    ...(filter.source ? { source: filter.source } : {}),
    ...(filter.scoringVersion ? { scoringVersion: String(filter.scoringVersion) } : {}),
    ...(filter.since ? { since: filter.since.toISOString().slice(0, 10) } : {}),
  };
}

/** Query string for `GET /admin/api/calibration`. */
export function calibrationApiParams(filter: CalibrationFilter): Record<string, string> {
  return {
    ...calibrationUrlParams(filter),
    ...(filter.since ? { since: filter.since.toISOString() } : {}),
  };
}

// --- report ------------------------------------------------------------------

export interface Summary {
  n: number;
  baseRate: number;
  meanPredicted: number;
  brier: number;
  logLoss: number;
  baselineBrier: number;
  baselineLogLoss: number;
}

export interface Bucket {
  lower: number;
  upper: number;
  n: number;
  meanPredicted: number | null;
  observed: number | null;
  lowSample: boolean;
}

export interface CalibrationReport {
  overall: Summary;
  buckets: Bucket[];
  byEvidence: { belowFloor: Summary; atOrAboveFloor: Summary };
  byDifficulty: Record<string, Summary>;
}

function rowAs(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseSummary(value: unknown): Summary {
  const row = rowAs(value);
  return {
    n: numberOr(row.n, 0),
    baseRate: numberOr(row.baseRate, 0),
    meanPredicted: numberOr(row.meanPredicted, 0),
    brier: numberOr(row.brier, 0),
    logLoss: numberOr(row.logLoss, 0),
    baselineBrier: numberOr(row.baselineBrier, 0),
    baselineLogLoss: numberOr(row.baselineLogLoss, 0),
  };
}

function parseBucket(value: unknown): Bucket {
  const row = rowAs(value);
  const n = numberOr(row.n, 0);
  return {
    lower: numberOr(row.lower, 0),
    upper: numberOr(row.upper, 0),
    n,
    meanPredicted: nullableNumber(row.meanPredicted),
    observed: nullableNumber(row.observed),
    lowSample: typeof row.lowSample === "boolean" ? row.lowSample : n < LOW_SAMPLE,
  };
}

/** Never throws: a malformed payload reads as "nothing recorded". */
export function parseCalibrationReport(value: unknown): CalibrationReport {
  const row = rowAs(value);
  const evidence = rowAs(row.byEvidence);
  const difficulty = rowAs(row.byDifficulty);
  return {
    overall: parseSummary(row.overall),
    buckets: Array.isArray(row.buckets) ? row.buckets.map(parseBucket) : [],
    byEvidence: {
      belowFloor: parseSummary(evidence.belowFloor),
      atOrAboveFloor: parseSummary(evidence.atOrAboveFloor),
    },
    byDifficulty: Object.fromEntries(
      Object.entries(difficulty).map(([key, found]) => [key, parseSummary(found)]),
    ),
  };
}

// --- reading the numbers -----------------------------------------------------

export type VerdictTone = "none" | "thin" | "better" | "equal" | "worse";

export function formatPct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

/**
 * Compares the engine with the laziest possible predictor: guessing the
 * average result every time. Brier score is the yardstick, lower is better.
 */
export function verdict(overall: Summary): { tone: VerdictTone; text: string } {
  if (overall.n === 0) {
    return {
      tone: "none",
      text: "No predictions have been recorded yet. They are logged as students answer questions.",
    };
  }
  if (overall.n < MIN_FOR_VERDICT) {
    return {
      tone: "thin",
      text: `Only ${overall.n.toLocaleString("en-NG")} predictions so far, too few to judge the engine. Check back as more students answer.`,
    };
  }
  if (overall.baselineBrier <= 0) {
    return {
      tone: "thin",
      text: "Every answer so far had the same result, so there is nothing to compare the engine against yet.",
    };
  }
  const guess = formatPct(overall.baseRate);
  const improvement = (overall.baselineBrier - overall.brier) / overall.baselineBrier;
  if (improvement >= EQUAL_BAND) {
    return {
      tone: "better",
      text: `The engine predicts better than simply guessing the average (${guess} right every time).`,
    };
  }
  if (improvement <= -EQUAL_BAND) {
    return {
      tone: "worse",
      text: `The engine predicts worse than simply guessing the average (${guess} right every time). Its settings likely need tuning.`,
    };
  }
  return {
    tone: "equal",
    text: `The engine is about as good as simply guessing the average (${guess} right every time). It is not adding much yet.`,
  };
}

/** Is the engine's average score above or below what students really get right? */
export function biasNote(overall: Summary): string | null {
  if (overall.n === 0) return null;
  const gap = overall.meanPredicted - overall.baseRate;
  if (Math.abs(gap) < BIAS_GAP) return null;
  const predicted = formatPct(overall.meanPredicted);
  const actual = formatPct(overall.baseRate);
  return gap > 0
    ? `The engine's average score (${predicted}) is higher than the share students actually get right (${actual}), so it may be judging students as stronger than they are.`
    : `The engine's average score (${predicted}) is lower than the share students actually get right (${actual}), so it may be holding students back.`;
}

export interface PlotPoint {
  /** Engine's average score in the bucket, 0-100. */
  x: number;
  /** Share the students actually got right, 0-100. */
  y: number;
  n: number;
  lowSample: boolean;
  range: string;
}

/** Only buckets holding answers can be drawn. */
export function plotPoints(buckets: readonly Bucket[]): PlotPoint[] {
  const points: PlotPoint[] = [];
  for (const bucket of buckets) {
    if (bucket.n === 0 || bucket.meanPredicted === null || bucket.observed === null) continue;
    points.push({
      x: Math.round(bucket.meanPredicted * 100),
      y: Math.round(bucket.observed * 100),
      n: bucket.n,
      lowSample: bucket.lowSample,
      range: `${Math.round(bucket.lower * 100)}–${Math.round(bucket.upper * 100)}%`,
    });
  }
  return points;
}
