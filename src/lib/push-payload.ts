// What goes inside an encrypted push message. Pure. The service worker trusts
// none of it (it re-checks the URL), but the server never sends anything that
// would need rejecting.

export const TITLE_MAX = 60;
export const BODY_MAX = 180;
const URL_MAX = 500;

/**
 * A same-origin path. "//host" and "/\host" are both treated by browsers as
 * protocol-relative URLs to another origin, so neither is allowed.
 */
export function isInternalPath(url: unknown): url is string {
  if (typeof url !== "string") return false;
  if (url.length === 0 || url.length > URL_MAX) return false;
  return /^\/(?![/\\])[^\s\\]*$/.test(url);
}

