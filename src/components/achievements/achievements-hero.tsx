import { LuFlame, LuSparkles } from "react-icons/lu";
import { levelPercent, type StreakInfo, type XpProfile } from "@/lib/gamification";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Collection progress as a ring: the one big number the page leads with. */
function CollectionRing({ earned, total }: { earned: number; total: number }) {
  const fraction = total > 0 ? earned / total : 0;
  return (
    <div
      role="img"
      aria-label={`${earned} of ${total} badges earned`}
      className="relative h-32 w-32 flex-shrink-0 md:h-36 md:w-36"
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke="#fbbf24"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="text-3xl font-extrabold leading-none tabular-nums md:text-4xl">{earned}</span>
        <span className="mt-1 text-xs font-semibold text-hero-ink">of {total} badges</span>
      </div>
    </div>
  );
}

/**
 * Presentational. Pulls level, collection and streak into a single panel so the
 * page opens with "where am I", then leads into what to do next.
 */
export function AchievementsHero({
  earned,
  total,
  xp,
  streak,
}: {
  earned: number;
  total: number;
  xp: XpProfile | null;
  streak: StreakInfo | null;
}) {
  const remaining = total - earned;
  const percent = xp ? levelPercent(xp.xpIntoLevel, xp.levelSpan, xp.isMax) : 0;

  return (
    <section
      aria-label="Your progress"
      className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-hero-from via-hero-via to-hero-to p-5 text-white shadow-lift md:p-7"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:text-left md:gap-8">
        {total > 0 && <CollectionRing earned={earned} total={total} />}

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Achievements</h1>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-hero-ink">
            {total === 0
              ? "Rewards for your effort will appear here."
              : earned === 0
                ? "Finish a practice set or lesson to earn your first badge."
                : remaining === 0
                  ? "You have earned every badge available today. New ones are added over time."
                  : `${remaining} ${remaining === 1 ? "badge" : "badges"} left to collect. New ones are added over time.`}
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            {xp && (
              <div className="min-w-0 flex-1 rounded-xl bg-white/12 px-4 py-3 ring-1 ring-white/15 sm:max-w-xs">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <LuSparkles className="h-4 w-4 text-amber-300" aria-hidden="true" />
                    Level {xp.level} · {xp.title}
                  </p>
                  <p className="text-xs font-semibold tabular-nums text-hero-ink">{xp.totalXp} XP</p>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-white/20"
                  role="progressbar"
                  aria-label={xp.isMax ? "Top level reached" : `Progress to Level ${xp.level + 1}`}
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-amber-300 transition-all duration-700"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-hero-ink">
                  {xp.isMax
                    ? "You have reached the top level."
                    : `${xp.xpToNext} XP to Level ${xp.level + 1}`}
                </p>
              </div>
            )}

            {streak && (
              <div className="flex items-center gap-3 rounded-xl bg-white/12 px-4 py-3 ring-1 ring-white/15 sm:min-w-40">
                <LuFlame className="h-7 w-7 flex-shrink-0 text-orange-300" aria-hidden="true" />
                <div className="text-left">
                  <p className="text-sm font-bold tabular-nums">
                    {streak.currentStreak > 0 ? `${streak.currentStreak}-day streak` : "No streak yet"}
                  </p>
                  <p className="text-xs text-hero-ink">
                    {streak.currentStreak > 0
                      ? `Best: ${streak.longestStreak} ${streak.longestStreak === 1 ? "day" : "days"}`
                      : "Study today to start one"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
