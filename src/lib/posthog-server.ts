import "server-only";

import { PostHog } from "posthog-node";

let client: PostHog | null | undefined;

/** One Node client for the server process. Null when the public token is unset. */
export function getPostHogServer(): PostHog | null {
  if (client !== undefined) return client;
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!token || !host) {
    client = null;
    return null;
  }
  client = new PostHog(token, {
    host,
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}
