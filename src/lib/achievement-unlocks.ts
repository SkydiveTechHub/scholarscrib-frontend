/** How long after earning an achievement still counts as "just unlocked". */
export const UNLOCK_WINDOW_MS = 5 * 60 * 1000;
/** The database and browser clocks can disagree a little. */
const SKEW_ALLOWANCE_MS = 60 * 1000;

type UnlockRow = {
  id: string;
  earned: boolean;
  earnedAt: string | null;
};

/**
 * Achievements earned within the window and not yet announced. The window is
 * what stops an old results page from re-announcing badges; `seen` stops the
 * same badge being announced twice inside it.
 */
export function freshUnlocks<T extends UnlockRow>(
  rows: readonly T[],
  now: number,
  seen: ReadonlySet<string>,
  windowMs: number = UNLOCK_WINDOW_MS,
): T[] {
  return rows.filter((row) => {
    if (!row.earned || !row.earnedAt || seen.has(row.id)) return false;
    const at = Date.parse(row.earnedAt);
    if (Number.isNaN(at)) return false;
    return at <= now + SKEW_ALLOWANCE_MS && now - at <= windowMs;
  });
}

export function progressPercent(progress: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((progress / target) * 100)));
}
