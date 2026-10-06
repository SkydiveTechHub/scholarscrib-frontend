import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import type { AchievementsOut } from "@/lib/api/types";

export type StudentAchievement = {
  id: string;
  title: string;
  description: string;
  iconUrl: string | null;
  criteriaType: string;
  criteriaValue: number;
  earned: boolean;
  /** ISO timestamp, or null when not yet earned. */
  earnedAt: string | null;
};

/** Catalogue entry folded with the student's earned flags, from the API. */
function asStudentAchievement(
  row: Record<string, unknown>,
): StudentAchievement {
  const criteriaValue = row.criteriaValue;
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    iconUrl: row.iconUrl === null ? null : String(row.iconUrl ?? ""),
    criteriaType: String(row.criteriaType ?? ""),
    criteriaValue: typeof criteriaValue === "number" ? criteriaValue : 0,
    earned: Boolean(row.earned),
    earnedAt: row.earnedAt === null || row.earnedAt === undefined
      ? null
      : String(row.earnedAt),
  };
}

/**
 * The catalogue with the student's earned set folded in —
 * `GET /api/achievements` answers both halves in one round trip.
 */
export async function getStudentAchievements(): Promise<StudentAchievement[]> {
  const { achievements } = await api<AchievementsOut>(endpoints.achievements);
  return (achievements ?? []).map(asStudentAchievement);
}

// Achievement awarding now happens on the backend (assessment submit and the
// awarding endpoint), which is the single writer for that table. There is no
// Next-side awarding path any more.