"use client";

import { useEffect, useState } from "react";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { freshXpAwards, parseXpProfile, type XpTransaction } from "@/lib/gamification";

const SEEN_KEY = "scholarscrib:announced-xp";
/** XP is awarded after the submit response, so the first look can be early. */
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

/**
 * XP the student has just been awarded, read from the backend ledger shortly
 * after an attempt is graded. Nothing is shown unless the server recorded it.
 */
export function useXpAwards(): [XpTransaction[], () => void] {
  const [awards, setAwards] = useState<XpTransaction[]>([]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function look(isRetry: boolean): Promise<void> {
      try {
        const raw = await request<unknown>({
          method: "GET",
          url: endpoints.gamificationProfile,
        });
        if (cancelled) return;
        const profile = parseXpProfile(raw);
        if (!profile) return;
        const seen = readSeen();
        const fresh = freshXpAwards(profile.recent, Date.now(), seen);
        if (fresh.length > 0) {
          fresh.forEach((a) => seen.add(a.id));
          writeSeen(seen);
          setAwards(fresh);
        } else if (!isRetry) {
          timer = setTimeout(() => void look(true), RETRY_DELAY_MS);
        }
      } catch {
        // A missing XP note must never get in the way of the results.
      }
    }

    void look(false);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return [awards, () => setAwards([])];
}
