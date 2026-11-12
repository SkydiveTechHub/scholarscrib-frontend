/**
 * CSRF `state` for the Google sign-in round trip. Generated when the flow
 * starts, kept in this tab's sessionStorage, and required to match on the
 * return trip, so a code planted by someone else's authorization is refused.
 */
import {
  peekPostAuthRedirect,
  rememberPostAuthRedirect,
} from "@/lib/post-auth-redirect";

const KEY = "sc.google_oauth_state";

export function createGoogleState(callbackUrl?: string | null): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const state = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  window.sessionStorage.setItem(KEY, state);
  // Survive the Google hop so /join/… (etc.) is restored after tokens.
  rememberPostAuthRedirect(callbackUrl);
  return state;
}

/** True only for the value stored at start; always consumes it (single use). */
export function consumeGoogleState(returned: string | null): boolean {
  let expected: string | null = null;
  try {
    expected = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
  } catch {
    return false;
  }
  return !!returned && !!expected && returned === expected;
}

/**
 * Where to send the user when Google returns `?error=` instead of a code.
 * `access_denied` is the user pressing Cancel/Deny on the consent screen —
 * not a failure, so it gets its own neutral message on the login page.
 * Preserves a pending post-auth redirect (e.g. `/join/CODE`) on the query.
 */
export function loginPathForGoogleError(error: string): string {
  const base =
    error === "access_denied"
      ? "/login?error=google_cancelled"
      : "/login?error=google";
  const pending = peekPostAuthRedirect();
  if (pending) {
    return `${base}&callbackUrl=${encodeURIComponent(pending)}`;
  }
  return base;
}
