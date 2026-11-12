/**
 * Tutor-center routing rules, deliberately free of framework imports so
 * `src/proxy.ts` can use them.
 */

/**
 * Which center rule a path falls under. Mirrors `classifyAdminPath` so the
 * boundary cases — /centered, /center/loginsomething — stay testable without
 * booting Next.
 */
export type CenterPathKind = "auth" | "login" | "console";

export function classifyCenterPath(pathname: string): CenterPathKind | null {
  if (pathname !== "/center" && !pathname.startsWith("/center/")) return null;
  if (
    pathname === "/center/api/auth" ||
    pathname.startsWith("/center/api/auth/")
  ) {
    return "auth";
  }
  if (
    pathname === "/center/login" ||
    pathname === "/center/forgot-password" ||
    pathname === "/center/reset-password"
  ) {
    return "login";
  }
  return "console";
}

/**
 * Whether a redirect target is a real path inside the center console.
 *
 * `startsWith("/center")` alone would accept `/centerXYZ`; the boundary check
 * is what makes this a path test. Protocol-relative URLs are rejected.
 */
export function isCenterPath(pathname: string): boolean {
  if (pathname.startsWith("//")) return false;
  return pathname === "/center" || pathname.startsWith("/center/");
}
