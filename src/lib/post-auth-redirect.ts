/**
 * Where to send a student after login / register / Google / verify / profile
 * complete. Survives OAuth round-trips via sessionStorage (same tab).
 *
 * Only relative same-origin paths are accepted — never absolute URLs.
 */

const KEY = "sc.post_auth_redirect";

export function isSafeCallbackUrl(
  url: string | null | undefined,
): url is string {
  return Boolean(
    url &&
      url.startsWith("/") &&
      !url.startsWith("//") &&
      !url.startsWith("/\\"),
  );
}

/** Remember a deep link (e.g. `/join/CODE`) for the next successful auth hop. */
export function rememberPostAuthRedirect(
  url: string | null | undefined,
): void {
  if (typeof window === "undefined") return;
  if (!isSafeCallbackUrl(url) || url === "/dashboard") {
    return;
  }
  try {
    window.sessionStorage.setItem(KEY, url);
  } catch {
    // Private mode / quota — auth still works; user lands on dashboard.
  }
}

export function peekPostAuthRedirect(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(KEY);
    return isSafeCallbackUrl(value) ? value : null;
  } catch {
    return null;
  }
}

/** Read and clear. Falls back when nothing was stored. */
export function consumePostAuthRedirect(fallback = "/dashboard"): string {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    return isSafeCallbackUrl(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
