const SHARED = [
  "Who is behind on the latest open assignment?",
  "Summarise results for my most recent assignment",
  "Which topics look weakest from work I assigned?",
  "Draft a short recommendation for a struggling student",
] as const;

/** Starters for the empty Tutor Astra composer. */
export function startersFor(): string[] {
  return [...SHARED];
}
