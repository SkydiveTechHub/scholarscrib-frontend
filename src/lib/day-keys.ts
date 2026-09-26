// Calendar-day arithmetic on `YYYY-MM-DD` keys, for grouping and labelling
// dates the backend sends. Keys rather than Dates: a Date would silently
// re-bucket a Lagos day across the viewer's timezone.

import type { DayKey } from "@/types/study-plan";

const DAY_MS = 86_400_000;

// Nigeria observes WAT (UTC+1) year-round; `en-CA` formats as YYYY-MM-DD.
const LAGOS_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Lagos",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today (or `date`) as a Lagos `YYYY-MM-DD` key. Sorts lexicographically. */
export function lagosDayKey(date: Date): DayKey {
  return LAGOS_DAY.format(date);
}

function toUtcMs(key: DayKey): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(key: DayKey, days: number): DayKey {
  return new Date(toUtcMs(key) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The Monday of the ISO week containing `key`. */
export function mondayOf(key: DayKey): DayKey {
  const day = new Date(toUtcMs(key)).getUTCDay();
  return addDays(key, 1 - (day === 0 ? 7 : day));
}
