"use client";

import { LuSparkles, LuX } from "react-icons/lu";
import { useXpAwards } from "@/hooks/api/use-xp-awards";

/** Explains XP the server has just awarded. Renders nothing otherwise. */
export function XpAwardBanner() {
  const [awards, dismiss] = useXpAwards();
  if (awards.length === 0) return null;

  return (
    <div
      role="status"
      className="card flex items-start gap-3 p-4 ring-1 ring-primary/30 animate-fade-in"
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <LuSparkles className="h-5 w-5" aria-hidden="true" />
      </span>
      <ul className="min-w-0 flex-1 text-sm font-semibold text-foreground">
        {awards.map((a) => (
          <li key={a.id}>
            +{a.amount} XP — {a.reason.toLowerCase()}
          </li>
        ))}
      </ul>
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
