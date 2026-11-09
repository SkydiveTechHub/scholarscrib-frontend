// Mirrors the clocks the server gives a past paper
// (`past_paper_minutes` in scholarscrib-backend), so the "about to start"
// dialog can say how long the student will have before the paper is created.
// The server stays the authority; this is only what we tell them.

const WAEC_NECO_MINUTES = 60;
const JAMB_ENGLISH_MINUTES = 40;
const JAMB_OTHER_MINUTES = 30;
const ENGLISH_SLUG = "english-language";

export function pastPaperMinutes(exam: string, subjectSlug: string): number {
  if (exam.toLowerCase() !== "jamb") return WAEC_NECO_MINUTES;
  return subjectSlug === ENGLISH_SLUG ? JAMB_ENGLISH_MINUTES : JAMB_OTHER_MINUTES;
}

/** "45 minutes", "1 hour", "1 hour 30 minutes". */
export function describeMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (rest > 0) parts.push(`${rest} minute${rest === 1 ? "" : "s"}`);
  return parts.join(" ") || "0 minutes";
}
