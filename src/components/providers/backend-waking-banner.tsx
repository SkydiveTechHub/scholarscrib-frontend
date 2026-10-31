"use client";

import { useBackendWaking } from "@/lib/api/waking";

/**
 * Shown while a request is waiting out a backend cold start, so a slow first
 * load reads as "warming up" rather than a hang.
 */
export function BackendWakingBanner() {
  const waking = useBackendWaking();
  if (!waking) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3"
    >
      <p className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
        Warming things up… this can take a few seconds.
      </p>
    </div>
  );
}
