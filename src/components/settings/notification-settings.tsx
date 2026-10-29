"use client";

import { useEffect, useState } from "react";
import { useUpdateNotificationPreferences } from "@/hooks/api/use-user";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { FormMessage } from "./section";
import type { PushCapability } from "@/lib/push-capability";
import type { NotificationPreferences } from "@/lib/push-validators";
import {
  checkWorkerReady,
  readPushState,
  subscribeThisDevice,
  unsubscribeThisDevice,
  type WorkerReadiness,
} from "@/lib/push-client";

export const PUSH_STATE_COPY: Record<string, string> = {
  unsupported: "This browser can't show ScholarsCrib notifications.",
  "ios-needs-install":
    "On iPhone and iPad, reminders need the app installed: tap Share, then Add to Home Screen, then open ScholarsCrib from your Home Screen.",
  denied: "Notifications are blocked for ScholarsCrib. Turn them on in your browser's site settings.",
  "needs-reload": "Almost there: close every ScholarsCrib tab, reopen the app, then try again.",
  failed: "Couldn't turn on notifications. Please try again.",
};

const TOGGLES: { key: keyof NotificationPreferences; label: string; hint: string }[] = [
  { key: "studyReminders", label: "Morning study reminder", hint: "Around 7am: today's plan and flashcards due." },
  { key: "streakReminders", label: "Streak reminder", hint: "Around 7pm, only if your streak is about to end." },
  { key: "announcements", label: "Announcements", hint: "Important news from ScholarsCrib." },
];

export function NotificationSettings({ initial }: { initial: NotificationPreferences }) {
  const [state, setState] = useState<PushCapability | null>(null);
  // Checked on mount so "Turn on" can prompt without spending the click's gesture.
  const [worker, setWorker] = useState<WorkerReadiness | null>(null);
  const [prefs, setPrefs] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const updatePreferences = useUpdateNotificationPreferences();

  useEffect(() => {
    readPushState().then(setState, () => setState("unsupported"));
    checkWorkerReady().then(setWorker, () => setWorker("needs-reload"));
  }, []);

  async function enable() {
    setBusy(true);
    setError("");
    const result = await subscribeThisDevice();
    if (result === "needs-reload" || result === "unsupported") setWorker(result);
    else if (result !== "subscribed") setError(PUSH_STATE_COPY[result] ?? PUSH_STATE_COPY.failed);
    setState(await readPushState());
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    setError("");
    await unsubscribeThisDevice();
    setState(await readPushState());
    setBusy(false);
  }

  async function toggle(key: keyof NotificationPreferences) {
    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setError("");
    try {
      await updatePreferences.mutateAsync({ [key]: next[key] });
    } catch {
      setPrefs(previous);
      setError("Couldn't save that change. Please try again.");
    }
  }

  if (state === null) return <p className="text-sm text-muted">Checking this device…</p>;

  const workerProblem = state === "default" && worker !== null && worker !== "ready" ? worker : null;

  return (
    <div>
      <FormMessage error={error} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Notifications on this device</p>
            {state === "subscribed" ? (
              <Badge variant="green">On</Badge>
            ) : state === "default" && !workerProblem ? (
              <Badge variant="neutral">Off</Badge>
            ) : (
              <Badge variant="amber">Unavailable</Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {workerProblem
              ? PUSH_STATE_COPY[workerProblem]
              : state === "subscribed"
                ? "You'll get reminders on this device."
                : state === "default"
                  ? "Turn on to get reminders on this device."
                  : PUSH_STATE_COPY[state]}
          </p>
        </div>
        {state === "subscribed" && (
          <button type="button" disabled={busy} onClick={disable} className={buttonClass("outline", "sm")}>
            {busy ? "Turning off…" : "Turn off"}
          </button>
        )}
        {state === "default" && !workerProblem && (
          <button type="button" disabled={busy || worker === null} onClick={enable} className={buttonClass("primary", "sm")}>
            {busy ? "Turning on…" : "Turn on"}
          </button>
        )}
      </div>

      <ul className="mt-5 divide-y divide-border border-t border-border">
        {TOGGLES.map((toggleItem) => (
          <li key={toggleItem.key}>
            {/* The whole row is the label, so the tap target is the row (well
                over 44px), not the 24px switch. */}
            <label
              htmlFor={`pref-${toggleItem.key}`}
              className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{toggleItem.label}</span>
                <span className="block text-sm text-muted">{toggleItem.hint}</span>
              </span>
              <input
                id={`pref-${toggleItem.key}`}
                type="checkbox"
                role="switch"
                checked={prefs[toggleItem.key]}
                onChange={() => toggle(toggleItem.key)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="relative h-6 w-11 shrink-0 rounded-full bg-muted/50 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-soft after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
              />
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">These choices apply to all your devices.</p>
    </div>
  );
}
