import type { Instrumentation } from "next";
import {
  distinctIdFromPostHogCookie,
  isAdminAnalyticsPath,
} from "@/lib/posthog-privacy";

export async function register() {
  // The Node client is created on the first server error, not at boot.
}

export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const path = request.path.split("?")[0] ?? "";
  if (isAdminAnalyticsPath(path)) return;

  try {
    const { getPostHogServer } = await import("@/lib/posthog-server");
    const posthog = getPostHogServer();
    if (!posthog) return;

    const cookie = request.headers.cookie;
    const header = Array.isArray(cookie) ? cookie.join("; ") : cookie;
    await posthog.captureExceptionImmediate(err, distinctIdFromPostHogCookie(header));
  } catch {
    // A failed report must not replace the error the student already hit.
  }
};
