/**
 * Student account status rules, as pure functions.
 *
 * Suspension has to bite on a session that is already live, not only at the
 * next sign-in: student sessions are JWT with a 60s profile refresh
 * (PROFILE_TTL_MS in auth.ts), so a suspended student would otherwise keep
 * browsing on a token nobody re-checks. `isSessionRevoked` is the rule the jwt
 * callback applies on that refresh; keeping it here is what makes it testable
 * without a session.
 *
 * See docs/superpowers/specs/2026-08-27-admin-console-structure-design.md
 */

export const ACCOUNT_STATUSES = ["active", "suspended"] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export function isAccountStatus(
  value: string | undefined | null,
): value is AccountStatus {
  return (
    typeof value === "string" &&
    (ACCOUNT_STATUSES as readonly string[]).includes(value)
  );
}

export function describeAccountStatus(account: { isActive: boolean }): {
  label: string;
  tone: "success" | "warning";
} {
  return account.isActive
    ? { label: "Active", tone: "success" }
    : { label: "Suspended", tone: "warning" };
}
