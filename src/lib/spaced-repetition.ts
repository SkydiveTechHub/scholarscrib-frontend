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
  if (days <= 0) return "now";
  if (days < 1 / 24) return "in a minute";
  if (days < 1) return `in ${Math.round(days * 24)}h`;
  if (days < 30) return `in ${Math.max(1, Math.round(days))}d`;
  if (days < 365) return `in ${Math.round(days / 30)}mo`;
  return `in ${Math.round(days / 365)}y`;
}
