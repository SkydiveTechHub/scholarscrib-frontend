// The scoped mock exam endpoint rejects a paper shorter than this
// (`count` must be >= 5). Asking for fewer surfaces a raw validation
// error, so the client decides first and never posts an invalid count.

/** Minimum questions the scoped mock exam API will accept. */
export const MOCK_EXAM_MIN_QUESTIONS = 5;

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
