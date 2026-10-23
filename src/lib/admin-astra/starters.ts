const SHARED = [
  "Look up a student",
  "How many students signed up this month?",
  "Show question coverage",
  "What's on the dashboard?",
] as const;

const OWNER = ["List the admin team", "List catalogue subjects"] as const;

/** Owner-only areas stay off the composer for everyone else. */
export function startersFor(isOwner: boolean): string[] {
  return isOwner ? [...SHARED, ...OWNER] : [...SHARED];
}
