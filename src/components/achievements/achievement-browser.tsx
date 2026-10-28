"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LuAward,
  LuBookOpen,
  LuCircleCheck,
  LuFlame,
  LuGraduationCap,
  LuLayers,
  LuLock,
  LuRefreshCw,
  LuStar,
  LuTrendingUp,
  LuTrophy,
} from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { progressPercent } from "@/lib/achievement-unlocks";
import {
  achievementState,
  availableCategories,
  filterByCategory,
  nextStep,
  type CategoryId,
} from "@/lib/achievements-ui";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  criteriaType: string;
  category?: string;
  criteriaValue: number;
  progress: number;
  target: number;
  earned: boolean;
  earnedAt: string | null;
};

const CRITERIA_ICONS: Record<string, React.ReactNode> = {
  questions_answered: <LuBookOpen className="h-6 w-6" />,
  perfect_score: <LuStar className="h-6 w-6" />,
  streak_days: <LuFlame className="h-6 w-6" />,
  lessons_completed: <LuGraduationCap className="h-6 w-6" />,
  subject_mastery: <LuTrophy className="h-6 w-6" />,
  mock_score_70: <LuAward className="h-6 w-6" />,
  cards_reviewed: <LuLayers className="h-6 w-6" />,
  questions_corrected: <LuRefreshCw className="h-6 w-6" />,
  mock_improvement: <LuTrendingUp className="h-6 w-6" />,
};

const CRITERIA_COLORS: Record<string, string> = {
  questions_answered: "bg-tone-blue-soft text-tone-blue-ink",
  perfect_score: "bg-tone-amber-soft text-tone-amber-ink",
  streak_days: "bg-tone-orange-soft text-tone-orange-ink",
  lessons_completed: "bg-tone-purple-soft text-tone-purple-ink",
  subject_mastery: "bg-tone-green-soft text-tone-green-ink",
  mock_score_70: "bg-tone-red-soft text-tone-red-ink",
  cards_reviewed: "bg-tone-blue-soft text-tone-blue-ink",
  questions_corrected: "bg-tone-green-soft text-tone-green-ink",
  mock_improvement: "bg-tone-green-soft text-tone-green-ink",
};

const STATE_LABEL = {
  earned: "Earned",
  "in-progress": "In progress",
  locked: "Locked",
} as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const state = achievementState(achievement);
  const step = nextStep(achievement);

  return (
    <li
      className={cn(
        "card p-5 transition-all",
        state === "earned" && "shadow-card",
        state === "locked" && "border-dashed",
        state !== "earned" && "opacity-90",
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl",
            state === "earned"
              ? CRITERIA_COLORS[achievement.criteriaType] || "bg-secondary text-muted"
              : "bg-secondary text-muted",
          )}
          aria-hidden="true"
        >
          {state === "earned"
            ? CRITERIA_ICONS[achievement.criteriaType] || <LuAward className="h-6 w-6" />
            : state === "locked"
              ? <LuLock className="h-5 w-5" />
              : CRITERIA_ICONS[achievement.criteriaType] || <LuAward className="h-6 w-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">{achievement.title}</h3>
            <Badge variant={state === "earned" ? "primary" : "neutral"}>
              {state === "earned" && (
                <LuCircleCheck className="mr-1 inline h-3 w-3" aria-hidden="true" />
              )}
              {STATE_LABEL[state]}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {achievement.description}
          </p>

          {state === "in-progress" && achievement.target > 1 && (
            <div className="mt-3">
              <Progress
                value={progressPercent(achievement.progress, achievement.target)}
                tone="primary"
                className="h-1.5"
              />
              <p className="mt-1 text-[11px] font-medium text-muted">
                {achievement.progress} / {achievement.target}
              </p>
            </div>
          )}

          {state === "earned" && achievement.earnedAt && (
            <p className="mt-2 text-[11px] font-medium text-muted">
              Earned {formatDate(achievement.earnedAt)}
            </p>
          )}

          {step && (
            <details className="group mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                How to earn this
              </summary>
              <p className="mt-1.5 text-xs text-muted">{step.text}</p>
              <Link
                href={step.href}
                className="mt-1.5 inline-block text-xs font-bold text-primary hover:underline"
              >
                Go there
                <span className="sr-only"> to work on {achievement.title}</span>
              </Link>
            </details>
          )}
        </div>
      </div>
    </li>
  );
}

/** Category filter plus the card grid. Filtering is the only client state. */
export function AchievementBrowser({
  achievements,
}: {
  achievements: Achievement[];
}) {
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const categories = availableCategories(achievements);
  const visible = filterByCategory(achievements, category);

  return (
    <div>
      {categories.length > 1 && (
        <div
          role="group"
          aria-label="Filter achievements by category"
          className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {[{ id: "all" as const, label: "All" }, ...categories].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "flex-shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                category === c.id
                  ? "border-primary bg-primary text-white"
                  : "border-border text-muted hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </ul>
    </div>
  );
}
