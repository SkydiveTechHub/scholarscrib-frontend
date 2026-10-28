import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import {
  parseDailyQuests,
  parseXpProfile,
  parseStreak,
  type DailyQuests,
  type StreakInfo,
  type XpProfile,
} from "@/lib/gamification";

/**
 * The student's XP standing from the backend ledger. Null when the request
 * fails or the payload is off-contract, so the page still renders without it.
 */
export async function getXpProfile(): Promise<XpProfile | null> {
  try {
    return parseXpProfile(await api<unknown>(endpoints.gamificationProfile));
  } catch {
    return null;
  }
}

/** Today's quests, or null when unavailable so the dashboard still renders. */
export async function getDailyQuests(): Promise<DailyQuests | null> {
  try {
    return parseDailyQuests(await api<unknown>(endpoints.gamificationQuests));
  } catch {
    return null;
  }
}

/** The streak and study-day calendar, or null when unavailable. */
export async function getStreak(): Promise<StreakInfo | null> {
  try {
    return parseStreak(await api<unknown>(endpoints.gamificationStreak));
  } catch {
    return null;
  }
}
