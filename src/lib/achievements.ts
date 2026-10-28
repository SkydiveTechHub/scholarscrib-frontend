import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import type { AchievementsOut } from "@/lib/api/types";

export type StudentAchievement = {
  id: string;
  title: string;
  description: string;
  criteriaType: string;
  /** Group on the Achievements page, decided by the backend. */
  category?: string;
  criteriaValue: number;
  /** Current figure toward `target`; equals `target` once earned. */
  progress: number;
  target: number;
  earned: boolean;
  /** ISO timestamp, or null when not yet earned. */
  earnedAt: string | null;
};

/** Catalogue entry folded with the student's earned flags, from the API. */
function asStudentAchievement(
  row: Record<string, unknown>,
): StudentAchievement {
  const criteriaValue = row.criteriaValue;
  const target = typeof row.target === "number" && row.target > 0 ? row.target : 1;
  const progress = typeof row.progress === "number" ? row.progress : 0;
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    criteriaType: String(row.criteriaType ?? ""),
    category: typeof row.category === "string" ? row.category : undefined,
    criteriaValue: typeof criteriaValue === "number" ? criteriaValue : 0,
    progress,
    target,
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