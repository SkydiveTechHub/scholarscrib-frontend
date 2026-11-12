/**
 * The paths an anonymous visitor — and therefore every search-engine crawler
 * and social scraper — may fetch.
 *
 * proxy.ts previously allowlisted exactly one path ("/") by equality, which
 * meant the entire public SEO surface 307-redirected to /login. A crawler
 * cannot tell that apart from the pages not existing.
 *
 * Deliberately narrow: this is the allowlist an auth boundary consults, so
 * every entry here is a route that is meant to be world-readable, and
 * everything absent stays gated. See scripts/test-public-routes.mts, which
 * asserts each gated tree is still closed.
 */
export const PUBLIC_EXACT_PATHS: readonly string[] = [
  "/",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  // PWA runtime. The service worker registration and its policy script are
  // fetched without a session the proxy recognises, and /offline is rendered
  // exactly when the server is unreachable — a redirect here would make the
  // whole PWA silently inert. The generated icons need no entry: proxy.ts's
  // matcher already excludes .png and .svg.
  "/sw.js",
  "/sw-policy.js",
  "/offline",
  // Only clears the caller's own session cookie, and must be reachable whether or not a token decodes.
  "/signed-out",
];

export const PUBLIC_PATH_PREFIXES: readonly string[] = [
  "/learn",
  "/past-questions",
  // Invite consent preview is readable before sign-in; accept still requires auth.
  "/join",
];

/** Sitemap shards: /sitemap/<shard>.xml, emitted by generateSitemaps. */
const SITEMAP_SHARD = /^\/sitemap\/[a-z0-9-]+\.xml$/;

/**
 * The ROOT open-graph image only. Images deeper in the tree are already
 * covered by PUBLIC_PATH_PREFIXES, so this pattern is anchored to the root —
 * an unanchored "ends with opengraph-image" rule would make
 * /dashboard/opengraph-image.png public.
 *
 * No twitter-image route exists in the app (only opengraph-image.tsx files
 * are defined), so a "twitter-image" alternative here would be a dead entry
 * in an auth allowlist — one that 404s rather than one worth keeping.
 */
const ROOT_OG_IMAGE = /^\/opengraph-image(-[A-Za-z0-9]+)?(\.[a-z]+)?$/;

export function isPublicPath(pathname: string): boolean {
  if (!pathname.startsWith("/")) return false;

  // Normalise a trailing slash, but never turn "/" into "".
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  if (PUBLIC_EXACT_PATHS.includes(path)) return true;

  // Segment-aware: "/learnable" is not inside "/learn".
  if (
    PUBLIC_PATH_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }

  return SITEMAP_SHARD.test(path) || ROOT_OG_IMAGE.test(path);
}

/**
 * Every top-level segment a real route lives under. A signed-out request for
 * anything else cannot be a page, so the proxy lets it through to render the
 * 404 page instead of bouncing it to /login — otherwise a mistyped URL looks
 * like "you must sign in" and the 404 is only ever seen when signed in.
 *
 * Letting an unknown path through exposes nothing: no route exists there. A
 * route added under a new segment but missing from this list is still guarded
 * by its own layout's session check (the proxy is an optimistic gate only);
 * scripts/test-public-routes.mts fails if src/app gains a segment that is not
 * listed here.
 */
export const KNOWN_ROOT_SEGMENTS: readonly string[] = [
  "api",
  "admin",
  "center",
  "dashboard",
  "classroom",
  "practice",
  "flashcards",
  "performance",
  "study-plan",
  "achievements",
  "library",
  "notifications",
  "settings",
  "my-centers",
  "join",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "complete-profile",
  "verify-email",
  // Redirects to /classroom (next.config.ts), so it must reach the redirect.
  "subjects",
  "learn",
  "past-questions",
  "about",
  "contact",
  "terms",
  "privacy",
  "offline",
  "signed-out",
  "sitemap",
  "sitemap-index.xml",
];

export function isKnownRootPath(pathname: string): boolean {
  const [segment] = pathname.split("/").filter(Boolean);
  // "/" and anything that looks like a file (sitemap.xml, robots.txt, sw.js,
  // manifest.webmanifest, opengraph-image…) is handled by isPublicPath or the
  // static layer; only real app segments count as "known" here.
  if (!segment) return true;
  return KNOWN_ROOT_SEGMENTS.includes(segment);
}
