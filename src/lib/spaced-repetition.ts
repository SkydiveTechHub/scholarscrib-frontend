// Flashcard review ratings and interval labels. The scheduling itself (SM-2 +
// FSRS-style stability) runs on the backend; it sends each rating's next
// interval and the UI only labels it.

export type ReviewRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export const RATINGS: ReviewRating[] = ["AGAIN", "HARD", "GOOD", "EASY"];

export const RATING_LABEL: Record<ReviewRating, string> = {
  AGAIN: "Again",
  HARD: "Hard",
  GOOD: "Good",
  EASY: "Easy",
};

/** Human label for the next interval ("in 3 days", "in 1 hour", "now"). */
export function intervalLabel(days: number): string {
  return `in ${shortInterval(days)}`;
}

/** Compact interval for button captions: "1m", "10m", "3h", "2d", "4mo". */
export function shortInterval(days: number): string {
  if (days <= 0) return "now";
  const minutes = days * 1440;
  if (minutes < 1.5) return "1m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (days < 1) return `${Math.round(days * 24)}h`;
  if (days < 30) return `${Math.max(1, Math.round(days))}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}
