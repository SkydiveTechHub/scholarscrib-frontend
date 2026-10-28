import { LuAward } from "react-icons/lu";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AchievementBrowser,
  type Achievement,
} from "@/components/achievements/achievement-browser";
import { AchievementsHero } from "@/components/achievements/achievements-hero";
import { StreakCalendar } from "@/components/gamification/streak-calendar";
import type { StreakInfo, XpProfile } from "@/lib/gamification";

export type { Achievement };

/** Presentational only — the catalogue is resolved by the server component. */
export function AchievementsView({
  achievements,
  xp = null,
  streak = null,
}: {
  achievements: Achievement[];
  xp?: XpProfile | null;
  streak?: StreakInfo | null;
}) {
  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <div className="animate-fade-in">
      <AchievementsHero
        earned={earnedCount}
        total={achievements.length}
        xp={xp}
        streak={streak}
      />

      {achievements.length === 0 ? (
        <EmptyState
          icon={<LuAward className="h-6 w-6" />}
          title="No achievements available yet"
          description="Check back soon — new challenges are on the way."
        />
      ) : (
        <AchievementBrowser achievements={achievements} />
      )}

      {streak && (
        <div className="mt-8">
          <StreakCalendar streak={streak} />
        </div>
      )}
    </div>
  );
}
