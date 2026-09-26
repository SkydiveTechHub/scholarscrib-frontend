// Exam timing constants the exam UI needs. Deadlines are enforced by the
// backend from `attempt.startedAt`; the browser countdown is a convenience.

/**
 * How long an untimed attempt (e.g. the quick quiz) stays resumable before
 * it's treated as abandoned. Untimed assessments have no deadline to expire
 * against, so without a fallback window an abandoned attempt — and the same
 * handful of questions — would be handed back to the student forever.
 */
export const UNTIMED_STALE_HOURS = 24;
