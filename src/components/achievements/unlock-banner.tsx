"use client";

import { useEffect } from "react";
import { LuAward, LuX } from "react-icons/lu";
import { useAchievementUnlocks } from "@/hooks/api/use-achievement-unlocks";

/** Gold and brand blue, matching the badge medallions. */
const CONFETTI_COLORS = ["#fbbf24", "#f59e0b", "#2563eb", "#4f46e5", "#ffffff"];

/**
 * One short burst. Skipped when the OS asks for less motion; the banner still
 * announces the unlock in text. The library loads only when a badge is earned.
 */
async function celebrate(): Promise<void> {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const { default: confetti } = await import("canvas-confetti");
  const base = { colors: CONFETTI_COLORS, disableForReducedMotion: true, zIndex: 60 };
  void confetti({ ...base, particleCount: 70, spread: 70, startVelocity: 45, origin: { x: 0.2, y: 0.7 }, angle: 60 });
  void confetti({ ...base, particleCount: 70, spread: 70, startVelocity: 45, origin: { x: 0.8, y: 0.7 }, angle: 120 });
}

/** Announces achievements the student has just earned. Renders nothing otherwise. */
export function AchievementUnlockBanner() {
  const [unlocks, dismiss] = useAchievementUnlocks();
  const hasUnlocks = unlocks.length > 0;

  // The hook returns each badge once, so this fires once per unlock.
  useEffect(() => {
    if (hasUnlocks) void celebrate().catch(() => {});
  }, [hasUnlocks]);

  if (!hasUnlocks) return null;

  return (
    <div
      role="status"
      className="card flex items-start gap-3 p-4 ring-1 ring-warning/30 animate-fade-in"
    >
      <span className="flex h-10 w-10 flex-shrink-0 animate-pop items-center justify-center rounded-xl bg-warning-soft text-warning">
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
