/**
 * CSRF `state` for the Google sign-in round trip. Generated when the flow
 * starts, kept in this tab's sessionStorage, and required to match on the
 * return trip, so a code planted by someone else's authorization is refused.
 */
const KEY = "sc.google_oauth_state";

export function createGoogleState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const state = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  window.sessionStorage.setItem(KEY, state);
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
