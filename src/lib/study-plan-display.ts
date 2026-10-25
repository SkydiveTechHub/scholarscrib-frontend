import { addDays, mondayOf, weekdayOf } from "@/lib/day-keys";
import { DAY_NAMES, DAY_SHORT, type Strength, type TimetableData } from "@/lib/study-timetable";

// Pure helpers for the study plan page. No React, no database.

export const ACTIVITY_LABELS: Record<string, string> = {
  LESSON: "Lesson",
  PRACTICE: "Practice",
  REVISION: "Revision",
  PAST_QUESTIONS: "Past questions",
  MOCK_EXAM: "Mock exam",
};

/** The page where doing the session also marks it done. */
export function planItemHref(item: {
  activityType: string;
  topicSlug: string | null;
  subject: { slug: string };
}): string {
  const topic = item.topicSlug ? `/classroom/${item.subject.slug}/${item.topicSlug}` : null;
  switch (item.activityType) {
    case "LESSON":
      return topic ?? `/classroom/${item.subject.slug}`;
    case "PRACTICE":
      return topic ? `${topic}/practice` : `/classroom/${item.subject.slug}`;
    case "REVISION":
      return topic ? `${topic}/quiz` : "/flashcards";
    case "PAST_QUESTIONS":
      return `/practice/past-questions/${item.subject.slug}`;
    case "MOCK_EXAM":
      return "/practice/mock-exam";
    default:
      return "/study-plan";
  }
}

type Day<T> = { date: string; items: T[] };

function byDay<T extends { date: string }>(items: readonly T[]): Day<T>[] {
  const days = new Map<string, T[]>();
  for (const item of items) days.set(item.date, [...(days.get(item.date) ?? []), item]);
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({ date, items: list }));
}

export function groupWindow<T extends { date: string; status: string }>(
  items: readonly T[],
  today: string,
) {
  const nextMonday = addDays(mondayOf(today), 7);
  const followingMonday = addDays(nextMonday, 7);
  return {
    today: items.filter((i) => i.date === today),
    recentMissed: items.filter((i) => i.date < today && i.status === "MISSED"),
    thisWeek: byDay(items.filter((i) => i.date > today && i.date < nextMonday)),
    nextWeek: byDay(items.filter((i) => i.date >= nextMonday && i.date < followingMonday)),
    /** The rest of the 14-day window, which runs past next week from Tuesday on. */
    later: byDay(items.filter((i) => i.date >= followingMonday)),
  };
}

/** Whether a session is on the day and subject the student put on their timetable. */
export function timetableMatch(
  item: { date: string; subjectId: string },
  timetable: TimetableData | null,
): Strength | null {
  if (!timetable || timetable.mode !== "CUSTOM") return null;
  const day = weekdayOf(item.date);
  const row = timetable.allocations.find((a) => a.day === day && a.subjectId === item.subjectId);
  return row ? row.strength : null;
}

export type WeekDay = {
  date: string;
  weekday: number;
  name: string;
  short: string;
  isToday: boolean;
  /** A day the student does not study; nothing is planned on it. */
  isRest: boolean;
  planned: number;
  done: number;
  missed: number;
  minutes: number;
  /** Short subject names for the day, in the order they first appear. */
  subjects: string[];
};

/** Monday to Sunday of the week containing `today`, with what is planned on each day. */
export function weekOverview(
  items: readonly {
    date: string;
    status: string;
    durationMinutes: number;
    subject: { code: string; name: string };
  }[],
  studyDays: readonly number[],
  today: string,
): WeekDay[] {
  const monday = mondayOf(today);
  return Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(monday, offset);
    const weekday = offset + 1;
    const day = items.filter((item) => item.date === date);
    const subjects: string[] = [];
    for (const item of day) {
      const label = item.subject.code || item.subject.name;
      if (!subjects.includes(label)) subjects.push(label);
    }
    return {
      date,
      weekday,
      name: DAY_NAMES[weekday],
      short: DAY_SHORT[weekday],
      isToday: date === today,
      isRest: !studyDays.includes(weekday),
      planned: day.length,
      done: day.filter((item) => item.status === "COMPLETED").length,
      missed: day.filter((item) => item.status === "MISSED").length,
      minutes: day.reduce((sum, item) => sum + item.durationMinutes, 0),
      subjects,
    };
  });
}
