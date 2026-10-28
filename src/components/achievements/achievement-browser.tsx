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
import { cn } from "@/lib/utils";
import { progressPercent } from "@/lib/achievement-unlocks";
import {
  achievementState,
  availableCategories,
  countByState,
  filterByCategory,
  filterByState,
  nextStep,
  upNext,
  type AchievementState,
  type CategoryId,
  type StateFilter,
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

const CRITERIA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  questions_answered: LuBookOpen,
  perfect_score: LuStar,
  streak_days: LuFlame,
  lessons_completed: LuGraduationCap,
  subject_mastery: LuTrophy,
  mock_score_70: LuAward,
  cards_reviewed: LuLayers,
  questions_corrected: LuRefreshCw,
  mock_improvement: LuTrendingUp,
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

const STATE_FILTERS: { id: StateFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "earned", label: "Earned" },
  { id: "in-progress", label: "In progress" },
  { id: "locked", label: "Locked" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const RING_R = 30;
const RING_C = 2 * Math.PI * RING_R;

/**
 * The badge itself. Earned gets a gold rim, in-progress a ring that fills toward
 * the target, locked a quiet dashed outline, so state reads before any text.
 */
function Medallion({
  achievement,
  state,
  size = "md",
}: {
  achievement: Achievement;
  state: AchievementState;
  size?: "md" | "sm";
}) {
  const Icon = CRITERIA_ICONS[achievement.criteriaType] ?? LuAward;
  const percent = progressPercent(achievement.progress, achievement.target);
  const box = size === "md" ? "h-16 w-16" : "h-12 w-12";
  const inner = size === "md" ? "inset-2" : "inset-1.5";
  const icon = size === "md" ? "h-6 w-6" : "h-5 w-5";

  return (
    <span className={cn("relative flex flex-shrink-0 items-center justify-center", box)} aria-hidden="true">
      {state === "earned" && (
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-soft" />
      )}
      {state === "in-progress" && (
        <svg viewBox="0 0 72 72" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="36" cy="36" r={RING_R} fill="none" strokeWidth="5" className="stroke-secondary" />
          <circle
            cx="36"
            cy="36"
            r={RING_R}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - percent / 100)}
            className="stroke-primary transition-[stroke-dashoffset] duration-500"
          />
        </svg>
      )}
      {state === "locked" && (
        <span className="absolute inset-0 rounded-full border-2 border-dashed border-border-strong" />
      )}
      <span
        className={cn(
          "absolute flex items-center justify-center rounded-full",
          inner,
          state === "earned"
            ? (CRITERIA_COLORS[achievement.criteriaType] ?? "bg-tone-amber-soft text-tone-amber-ink")
            : state === "in-progress"
              ? "bg-card text-primary"
              : "bg-secondary text-muted",
        )}
      >
        {state === "locked" ? (
          <LuLock className={size === "md" ? "h-5 w-5" : "h-4 w-4"} />
        ) : (
          <Icon className={icon} />
        )}
      </span>
    </span>
  );
}

/** The closest badges to finish, each with a single route into the activity. */
function UpNext({ items }: { items: Achievement[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="up-next-title" className="mb-8">
      <h2 id="up-next-title" className="text-base font-bold text-foreground">
        Close to earning
      </h2>
      <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {items.map((a) => {
          const step = nextStep(a);
          const percent = progressPercent(a.progress, a.target);
          return (
            <li key={a.id} className="card flex items-center gap-3 p-4">
              <Medallion achievement={a} state="in-progress" size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{a.title}</p>
                <p className="text-xs tabular-nums text-muted">
                  {a.progress} / {a.target} · {percent}%
                </p>
                {step && (
                  <Link href={step.href} className="mt-0.5 inline-block text-xs font-bold text-primary hover:underline">
                    Keep going
                    <span className="sr-only"> on {a.title}</span>
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const state = achievementState(achievement);
  const step = nextStep(achievement);
  const showCount = state === "in-progress" && achievement.target > 1;

  return (
    <li
      className={cn(
        "card relative flex flex-col p-5 transition-shadow",
        state === "earned" && "border-tone-amber-line shadow-lift",
        state === "locked" && "border-dashed bg-transparent shadow-none",
      )}
    >
      <div className="flex items-start gap-4">
        <Medallion achievement={achievement} state={state} />
        <div className="min-w-0 flex-1">
          <h3 className={cn("text-sm font-bold", state === "locked" ? "text-muted" : "text-foreground")}>
            {achievement.title}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">{achievement.description}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 text-xs font-semibold">
        {state === "earned" && (
          <span className="inline-flex items-center gap-1 text-tone-amber-ink">
            <LuCircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Earned{achievement.earnedAt ? ` ${formatDate(achievement.earnedAt)}` : ""}
          </span>
        )}
        {showCount && (
          <span className="tabular-nums text-primary">
            {achievement.progress} / {achievement.target}
          </span>
        )}
        {state === "in-progress" && !showCount && <span className="text-primary">In progress</span>}
        {state === "locked" && (
          <span className="inline-flex items-center gap-1 text-muted">
            <LuLock className="h-3 w-3" aria-hidden="true" />
            Locked
          </span>
        )}
      </div>

      {step && (
        <details className="group mt-2 border-t border-border pt-2">
          <summary className="cursor-pointer text-xs font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            How to earn this
          </summary>
          <p className="mt-1.5 text-xs text-muted">{step.text}</p>
          <Link href={step.href} className="mt-1.5 inline-block text-xs font-bold text-primary hover:underline">
            Go there
            <span className="sr-only"> to work on {achievement.title}</span>
          </Link>
        </details>
      )}
    </li>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex-shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Status and category filters plus the badge grid. Filtering is the only client state. */
export function AchievementBrowser({
  achievements,
}: {
  achievements: Achievement[];
}) {
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [status, setStatus] = useState<StateFilter>("all");
  const categories = availableCategories(achievements);
  const inCategory = filterByCategory(achievements, category);
  const counts = countByState(inCategory);
  const visible = filterByState(inCategory, status);

  return (
    <div>
      <UpNext items={upNext(achievements)} />

      <div className="mb-4 flex flex-col gap-3">
        <div
          role="group"
          aria-label="Filter achievements by status"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {STATE_FILTERS.map((s) => (
            <Chip key={s.id} active={status === s.id} onClick={() => setStatus(s.id)}>
              {s.label} ({s.id === "all" ? inCategory.length : counts[s.id]})
            </Chip>
          ))}
        </div>

        {categories.length > 1 && (
          <div
            role="group"
            aria-label="Filter achievements by category"
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          >
            {[{ id: "all" as const, label: "All categories" }, ...categories].map((c) => (
              <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                {c.label}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">
          No badges match these filters. Try a different status or category.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </ul>
      )}
    </div>
  );
}
