// Shown the moment a submitted paper navigates here, while the result renders
// on the server. Matches the exam's marking overlay, so the hand-off from the
// paper to its result reads as one continuous step.
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary/25 border-t-primary" />
      <p className="mt-5 text-base font-bold text-foreground">Marking your paper…</p>
      <p className="mt-1 max-w-xs text-sm text-muted">
        Your answers are in. Your result will open in a moment.
      </p>
    </div>
  );
}
