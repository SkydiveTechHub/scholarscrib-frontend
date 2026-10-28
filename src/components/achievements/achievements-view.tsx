import { LuAward } from "react-icons/lu";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AchievementBrowser,
  type Achievement,
} from "@/components/achievements/achievement-browser";
import { XpCard } from "@/components/gamification/xp-card";
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
  const progress =
    achievements.length > 0
      ? Math.round((earnedCount / achievements.length) * 100)
      : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Achievements"
        description={
          achievements.length > 0
            ? `${earnedCount} of ${achievements.length} achievements earned`
            : "Rewards for your effort"
        }
      />

      {xp && <XpCard profile={xp} />}
      {streak && <StreakCalendar streak={streak} />}

      {achievements.length > 0 && (
        <div className="card mb-8 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning-soft text-warning">
                <LuAward className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">Collection progress</p>
                <p className="text-xs text-muted">
                  {earnedCount === 0
                    ? "Complete activities to earn your first badge"
                    : `Keep going, ${achievements.length - earnedCount} badge${
                        achievements.length - earnedCount === 1 ? "" : "s"
                      } to go`}
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-foreground">{progress}%</span>
          </div>
          <p className="mt-2 text-xs text-muted">
            {earnedCount} of {achievements.length} badges earned. This counts every badge
            available today; new ones are added over time, so the total can grow.
          </p>
          <Progress value={progress} tone={progress === 100 ? "success" : "primary"} className="mt-3 h-2.5" />
        </div>
      )}

      {achievements.length === 0 ? (
        <EmptyState
          icon={<LuAward className="h-6 w-6" />}
          title="No achievements available yet"
          description="Check back soon — new challenges are on the way."
        />
      ) : (
        <AchievementBrowser achievements={achievements} />
      )}
    </div>
  );
}
