import type { CaptureResult } from "posthog-js";

/**
 * Person properties the browser may set. Matches the server allow-list:
 * class, track, state, and tier. Name, email, phone, and message text stay off.
 */
export type StudentAnalyticsProfile = {
  classLevel?: string | null;
  track?: string | null;
  state?: string | null;
  tier?: string | null;
};

export function studentPersonProperties(
  profile: StudentAnalyticsProfile,
): Record<string, string> {
  const props: Record<string, string> = {};
  if (profile.classLevel) props.class_level = profile.classLevel;
  if (profile.track) props.track = profile.track;
  if (profile.state) props.state = profile.state;
  if (profile.tier) props.tier = profile.tier;
  return props;
}

/** Admin, cron, and notification-read traffic stays untracked. */
export function isAdminAnalyticsPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** True when a history API URL points at a different path than the page open now. */
export function historyTargetChangesPath(
  url: string | URL | null | undefined,
  currentHref: string,
): boolean {
  if (url == null) return false;
  try {
    return new URL(url, currentHref).pathname !== new URL(currentHref).pathname;
  } catch {
    return false;
  }
}

export function withoutAdminCapture(event: CaptureResult): CaptureResult | null {
  if (typeof window !== "undefined" && isAdminAnalyticsPath(window.location.pathname)) {
    return null;
  }

  const pathname = event.properties.$pathname;
  if (typeof pathname === "string" && isAdminAnalyticsPath(pathname)) return null;

  const currentUrl = event.properties.$current_url;
  if (typeof currentUrl === "string") {
    try {
      const path = new URL(currentUrl, "https://scholarscrib.com").pathname;
      if (isAdminAnalyticsPath(path)) return null;
    } catch {
      // A malformed URL is not an admin path; let the event through.
    }
  }

  return event;
}

/** Reads the distinct id PostHog stored in its first-party cookie, if any. */
export function distinctIdFromPostHogCookie(
  cookieHeader: string | null | undefined,
): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/(?:^|;\s*)ph_phc_[^=]*_posthog=([^;]*)/);
  if (!match?.[1]) return undefined;
  try {
    const data = JSON.parse(decodeURIComponent(match[1])) as {
      distinct_id?: unknown;
    };
    return typeof data.distinct_id === "string" && data.distinct_id.length > 0
      ? data.distinct_id
      : undefined;
  } catch {
    return undefined;
  }
}
