"use client";

import { useEffect } from "react";
import { identifyStudent } from "@/lib/posthog-browser";
import type { StudentAnalyticsProfile } from "@/lib/posthog-privacy";

type PostHogIdentifyProps = StudentAnalyticsProfile & { id: string };

/** Links this browser to the same user id the API uses. No name or email. */
export function PostHogIdentify({
  id,
  classLevel,
  track,
  state,
  tier,
}: PostHogIdentifyProps) {
  useEffect(() => {
    identifyStudent(id, { classLevel, track, state, tier });
  }, [id, classLevel, track, state, tier]);

  return null;
}
