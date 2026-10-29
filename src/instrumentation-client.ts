import posthog from "posthog-js";
import { bindPageLeaveOnHistoryChange } from "@/lib/posthog-browser";
import { withoutAdminCapture } from "@/lib/posthog-privacy";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// A checkout without the public token still builds and runs. Analytics stays off.
if (token && apiHost) {
  try {
    posthog.init(token, {
      api_host: apiHost,
      ui_host: "https://eu.posthog.com",
      defaults: "2026-08-30",
      person_profiles: "identified_only",
      autocapture: true,
      capture_pageview: "history_change",
      capture_pageleave: true,
      capture_heatmaps: true,
      capture_dead_clicks: true,
      capture_exceptions: true,
      loaded: bindPageLeaveOnHistoryChange,
      // Console lines and response bodies can contain tutor text and answers.
      enable_recording_console_log: false,
      // URL, method, status, and duration for the replay network panel.
      // Bodies stay off. PostHog still drops Authorization and Cookie headers.
      capture_performance: { network_timing: true, web_vitals: true },
      session_recording: {
        // Page text stays visible so a replay shows labels, links, and what
        // was clicked. Typed fields (email, password, tutor drafts) stay masked.
        maskAllInputs: true,
        recordHeaders: true,
        recordBody: false,
        streamNetworkBody: false,
      },
      before_send: withoutAdminCapture,
    });
  } catch {
    // A failed analytics init must not stop the app from loading.
  }
}
