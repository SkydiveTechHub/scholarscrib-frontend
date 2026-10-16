"use client";

import { useEffect, useState } from "react";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import type { AchievementsOut } from "@/lib/api/types";
import { freshUnlocks } from "@/lib/achievement-unlocks";

export type Unlock = { id: string; title: string; earnedAt: string | null; earned: boolean };

const SEEN_KEY = "scholarscrib:announced-achievements";
/** Awarding runs after the submit response, so the first look can be early. */
const RETRY_DELAY_MS = 2500;

function readSeen(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

function writeSeen(ids: Set<string>): void {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-200)));
  } catch {
    // Storage can be blocked; the 5 minute window still bounds repeats.
  }
}

function asUnlock(row: Record<string, unknown>): Unlock {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    earned: Boolean(row.earned),
    earnedAt: typeof row.earnedAt === "string" ? row.earnedAt : null,
  };
}

/**
 * Achievements the student has just earned, found by asking the backend
 * shortly after an attempt is graded. Each one is returned once, ever.
 */
export function useAchievementUnlocks(): [Unlock[], () => void] {
  const [unlocks, setUnlocks] = useState<Unlock[]>([]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function look(isRetry: boolean): Promise<void> {
      try {
        const { achievements } = await request<AchievementsOut>({
          method: "GET",
          url: endpoints.achievements,
        });
        if (cancelled) return;
        const seen = readSeen();
        const fresh = freshUnlocks((achievements ?? []).map(asUnlock), Date.now(), seen);
        if (fresh.length > 0) {
          fresh.forEach((u) => seen.add(u.id));
          writeSeen(seen);
          setUnlocks(fresh);
        } else if (!isRetry) {
          timer = setTimeout(() => void look(true), RETRY_DELAY_MS);
        }
      } catch {
        // A missing banner must never get in the way of the results.
      }
    }

    void look(false);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return [unlocks, () => setUnlocks([])];
}
