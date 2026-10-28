"use client";

import { useEffect, useState } from "react";
import { LuTrendingUp } from "react-icons/lu";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { parseImprovement } from "@/lib/gamification";

/**
 * Says so when this attempt shows real improvement over comparable practice.
 * Silent on ties, dips and thin history, and on any failure.
 */
export function ImprovementNote({ attemptId }: { attemptId: string }) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    request<unknown>({
      method: "GET",
      url: endpoints.gamificationImprovement,
      params: { attemptId },
    })
      .then((raw) => {
        if (!cancelled) setMessage(parseImprovement(raw)?.message ?? null);
      })
      .catch(() => {
        // Missing encouragement must never get in the way of the results.
      });
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  if (!message) return null;
  return (
    <div role="status" className="card flex items-center gap-3 p-4 ring-1 ring-success/30 animate-fade-in">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
        <LuTrendingUp className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-foreground">{message}</p>
    </div>
  );
}
