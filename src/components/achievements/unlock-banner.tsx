"use client";

import { LuAward, LuX } from "react-icons/lu";
import { useAchievementUnlocks } from "@/hooks/api/use-achievement-unlocks";

/** Announces achievements the student has just earned. Renders nothing otherwise. */
export function AchievementUnlockBanner() {
  const [unlocks, dismiss] = useAchievementUnlocks();
  if (unlocks.length === 0) return null;

  return (
    <div
      role="status"
      className="card flex items-start gap-3 p-4 ring-1 ring-warning/30 animate-fade-in"
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
        <LuAward className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">
          {unlocks.length === 1 ? "Achievement unlocked" : "Achievements unlocked"}
        </p>
        <ul className="mt-0.5 text-xs text-muted">
          {unlocks.map((u) => (
            <li key={u.id}>{u.title}</li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-muted transition-colors hover:text-foreground"
      >
        <LuX className="h-4 w-4" />
      </button>
    </div>
  );
}
