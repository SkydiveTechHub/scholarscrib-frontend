"use client";

import posthog from "posthog-js";
import {
  historyTargetChangesPath,
  isAdminAnalyticsPath,
  studentPersonProperties,
  type StudentAnalyticsProfile,
} from "@/lib/posthog-privacy";

function whenReady(run: () => void): void {
  if (!posthog.__loaded) return;
  try {
    run();
  } catch {
    // Analytics must not change the page the student is on.
  }
}

export function identifyStudent(id: string, profile: StudentAnalyticsProfile): void {
  whenReady(() => {
    posthog.identify(id, studentPersonProperties(profile));
  });
}

/** Clears the browser identity so the next person on this device starts clean. */
export function resetPostHog(): void {
  whenReady(() => {
    posthog.reset();
  });
}

export function syncPostHogRecording(pathname: string): void {
  whenReady(() => {
    if (isAdminAnalyticsPath(pathname)) posthog.stopSessionRecording();
    else posthog.startSessionRecording();
  });
}

export function capturePostHogException(error: unknown): void {
  whenReady(() => {
    posthog.captureException(error);
  });
}

const PAGE_LEAVE_MARK = "__scholarscribPageLeaveWrapped";

/**
 * Next.js changes the path without hiding the tab, so PostHog's pagehide
 * listener never runs. Send $pageleave first, then let the SDK record the
 * next pageview. That is what bounce rate, time on page, and scroll depth use.
 */
export function bindPageLeaveOnHistoryChange(client: {
  capture: (event: string) => unknown;
}): void {
  if (typeof window === "undefined") return;
  const history = window.history;
  const pushState = history.pushState as History["pushState"] & { [PAGE_LEAVE_MARK]?: boolean };
  if (pushState[PAGE_LEAVE_MARK]) return;

  const wrap = (method: "pushState" | "replaceState") => {
    const current = history[method];
    const wrapped = function (
      this: History,
      ...args: Parameters<History["pushState"]>
    ) {
      if (historyTargetChangesPath(args[2], window.location.href)) {
        client.capture("$pageleave");
      }
      return current.apply(this, args);
    } as History["pushState"] & { [PAGE_LEAVE_MARK]?: boolean };
    wrapped[PAGE_LEAVE_MARK] = true;
    history[method] = wrapped;
  };

  wrap("pushState");
  wrap("replaceState");
  window.addEventListener(
    "popstate",
    () => {
      client.capture("$pageleave");
    },
    true,
  );
}
