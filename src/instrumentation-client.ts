import posthog from "posthog-js";
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
      capture_exceptions: true,
      // The project opt-in and the 2026-06-25 default would record console
      // lines and API bodies. Tutor text and answers live in both.
      enable_recording_console_log: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
        streamNetworkBody: false,
      },
      before_send: withoutAdminCapture,
    });
  } catch {
    // A failed analytics init must not stop the app from loading.
  }
}
