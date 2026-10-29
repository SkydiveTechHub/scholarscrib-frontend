"use client";

import posthog from "posthog-js";
import {
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
