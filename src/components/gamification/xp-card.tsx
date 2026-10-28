import { LuSparkles } from "react-icons/lu";
import { Progress } from "@/components/ui/progress";
import { levelPercent, type XpProfile } from "@/lib/gamification";

/** Presentational only. Levels are cosmetic, not an academic qualification. */
export function XpCard({ profile }: { profile: XpProfile }) {
  const percent = levelPercent(profile.xpIntoLevel, profile.levelSpan, profile.isMax);
  const nextText = profile.isMax
    ? "You have reached the top level."
    : `${profile.xpToNext} XP to Level ${profile.level + 1}`;

  return (
    <section aria-labelledby="xp-card-title" className="card mb-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <LuSparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p id="xp-card-title" className="text-sm font-bold text-foreground">
              Level {profile.level} · {profile.title}
            </p>
            <p className="text-xs text-muted">
              {profile.totalXp === 0
                ? "Finish a lesson or practice set to earn your first XP"
                : `${profile.totalXp} XP earned`}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-muted">{nextText}</span>
      </div>
      <Progress value={percent} tone="primary" className="mt-3 h-2.5" />
      <p className="sr-only">
        {profile.isMax
          ? "Top level reached."
          : `${percent}% of the way to Level ${profile.level + 1}.`}
      </p>
    </section>
  );
}
