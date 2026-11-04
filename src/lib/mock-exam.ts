// The scoped mock exam endpoint rejects a paper shorter than this
// (`count` must be >= 5). Asking for fewer surfaces a raw validation
// error, so the client decides first and never posts an invalid count.

/** Minimum questions the scoped mock exam API will accept. */
export const MOCK_EXAM_MIN_QUESTIONS = 5;

/** Longest clock a mock exam can be given, and the step between choices. */
export const MOCK_EXAM_MAX_MINUTES = 30;
export const MOCK_EXAM_MINUTE_STEP = 5;
export const MOCK_EXAM_TIME_OPTIONS = Array.from(
  { length: MOCK_EXAM_MAX_MINUTES / MOCK_EXAM_MINUTE_STEP },
  (_, i) => (i + 1) * MOCK_EXAM_MINUTE_STEP,
);

/**
 * The clock for a mock exam, from a query-string value. Null (untimed) for
 * anything that is not a whole number of minutes the API will accept, so a
 * hand-built link falls back to the default rather than a validation error.
 */
export function parseMockExamMinutes(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") return null;
  const minutes = Number(raw);
  if (!Number.isInteger(minutes)) return null;
  if (minutes < MOCK_EXAM_MINUTE_STEP || minutes > MOCK_EXAM_MAX_MINUTES) {
    return null;
  }
  return minutes;
}

/**
 * How many questions to ask for.
 *
 * `available` is how many tagged questions the chosen scope holds. Returns
 * null when that scope, or the requested length, cannot meet the minimum —
 * the caller must not post.
 */
export function scopedMockExamCount(
  requested: number,
  available: number,
): number | null {
  if (!Number.isFinite(requested) || !Number.isFinite(available)) return null;
  const count = Math.floor(Math.min(requested, available));
  if (count < MOCK_EXAM_MIN_QUESTIONS) return null;
  return count;
}
