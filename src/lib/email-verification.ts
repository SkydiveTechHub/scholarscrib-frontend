/**
 * Whether a signed-in student must verify their email before the dashboard.
 *
 * The decision is driven only by what the backend's session response says:
 * `emailVerified` is a timestamp once verified and null until then. Accounts
 * the backend already marks verified (Google sign-ins) carry the timestamp and
 * pass straight through, so there is no provider check here. An account with
 * no email has nothing to verify and is never gated.
 *
 * Pure — no session — so the rule is testable on its own, like
 * `profile-completion.ts`.
 */

type VerificationFields = {
  email?: string | null;
  emailVerified?: string | null;
};

export function needsEmailVerification(user: VerificationFields): boolean {
  return Boolean(user.email) && !user.emailVerified;
}
