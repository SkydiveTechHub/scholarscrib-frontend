import { z } from "zod";

/** How long after an award it still counts as "just earned". */
export const XP_WINDOW_MS = 5 * 60 * 1000;
const SKEW_ALLOWANCE_MS = 60 * 1000;

const xpTransactionSchema = z.object({
  id: z.string(),
  amount: z.number(),
  reason: z.string(),
  occurredAt: z.string(),
});

const xpProfileSchema = z.object({
  totalXp: z.number(),
  level: z.number(),
  title: z.string(),
  xpIntoLevel: z.number(),
  xpToNext: z.number(),
  levelSpan: z.number(),
  isMax: z.boolean(),
  recent: z.array(xpTransactionSchema),
});

export type XpTransaction = z.infer<typeof xpTransactionSchema>;
export type XpProfile = z.infer<typeof xpProfileSchema>;

/** The backend owns XP; anything that does not match its contract is dropped. */
export function parseXpProfile(raw: unknown): XpProfile | null {
  const parsed = xpProfileSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function levelPercent(
  xpIntoLevel: number,
  levelSpan: number,
  isMax = false,
): number {
  if (isMax) return 100;
  if (levelSpan <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((xpIntoLevel / levelSpan) * 100)));
}

/**
 * Awards made within the window and not yet announced. Mirrors
 * `freshUnlocks`: the window stops an old results page re-announcing XP, and
 * `seen` stops the same award appearing twice inside it.
 */
export function freshXpAwards(
  rows: readonly XpTransaction[],
  now: number,
  seen: ReadonlySet<string>,
  windowMs: number = XP_WINDOW_MS,
): XpTransaction[] {
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    const at = Date.parse(row.occurredAt);
    if (Number.isNaN(at)) return false;
    return at <= now + SKEW_ALLOWANCE_MS && now - at <= windowMs;
  });
}

const questSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  target: z.number(),
  progress: z.number(),
  complete: z.boolean(),
  // A quest opens an in-app activity; anything else is refused.
  href: z.string().regex(/^\/(?!\/)/),
});

const dailyQuestsSchema = z.object({
  day: z.string(),
  quests: z.array(questSchema),
  allComplete: z.boolean(),
  bonusXp: z.number(),
  bonusAwarded: z.boolean(),
});

export type DailyQuest = z.infer<typeof questSchema>;
export type DailyQuests = z.infer<typeof dailyQuestsSchema>;

export function parseDailyQuests(raw: unknown): DailyQuests | null {
  const parsed = dailyQuestsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function questPercent(progress: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((progress / target) * 100)));
}

const streakSchema = z.object({
  timezone: z.string(),
  today: z.string(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  days: z.array(z.string()),
  studiedToday: z.boolean(),
  daysSinceLastStudy: z.number().nullable(),
});

export type StreakInfo = z.infer<typeof streakSchema>;

export function parseStreak(raw: unknown): StreakInfo | null {
  const parsed = streakSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export type CalendarCell = {
  date: string;
  studied: boolean;
  isToday: boolean;
  /** After today: shown blank, never as a miss. */
  future: boolean;
  /** Inside the window the server sent; earlier cells have no data. */
  inRange: boolean;
};

const DAY_MS = 86_400_000;
const toMs = (key: string): number => Date.parse(`${key}T00:00:00Z`);
const toKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/**
 * Monday-first columns of seven day cells ending with today's week. Dates are
 * Lagos civil days as the server sent them, handled as plain calendar keys so
 * the viewer's own timezone never shifts a cell.
 */
export function calendarGrid(
  studiedDays: readonly string[],
  today: string,
  weeks = 12,
  windowStart?: string,
): CalendarCell[][] {
  const studied = new Set(studiedDays);
  const todayMs = toMs(today);
  const mondayOffset = (new Date(todayMs).getUTCDay() + 6) % 7;
  const lastMonday = todayMs - mondayOffset * DAY_MS;
  const firstMs = lastMonday - (weeks - 1) * 7 * DAY_MS;
  const startMs = windowStart ? toMs(windowStart) : firstMs;
  const grid: CalendarCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: CalendarCell[] = [];
    for (let d = 0; d < 7; d++) {
      const ms = firstMs + (w * 7 + d) * DAY_MS;
      const date = toKey(ms);
      column.push({
        date,
        studied: studied.has(date),
        isToday: date === today,
        future: ms > todayMs,
        inRange: ms >= startMs,
      });
    }
    grid.push(column);
  }
  return grid;
}

export type ReturnPrompt = { title: string; body: string; href: string; cta: string };

/**
 * A supportive nudge, never a penalty. Nothing for someone who has studied
 * today or has not started; a gentle reminder while a streak is still alive;
 * a small first step after a longer gap.
 */
export function returnPrompt(streak: StreakInfo): ReturnPrompt | null {
  if (streak.studiedToday || streak.daysSinceLastStudy === null) return null;
  if (streak.daysSinceLastStudy <= 1 && streak.currentStreak > 0) {
    return {
      title: "Keep it going today",
      body: `Study today to extend your ${streak.currentStreak}-day streak.`,
      href: "/practice",
      cta: "Start now",
    };
  }
  return {
    title: "Ready to get back on track?",
    body: "Start with a 5-minute review. Every session counts.",
    href: "/practice",
    cta: "Start a quick review",
  };
}

const improvementSchema = z.object({
  status: z.string(),
  message: z.string().nullish(),
});

export type Improvement = { status: string; message: string | null };

/**
 * Only a genuine improvement carries a message. The server already enforces
 * this; checking the status here too means a stray message on a dip or a tie
 * can never be shown as a celebration.
 */
export function parseImprovement(raw: unknown): Improvement | null {
  const parsed = improvementSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { status, message } = parsed.data;
  return { status, message: status === "improved" ? (message ?? null) : null };
}
