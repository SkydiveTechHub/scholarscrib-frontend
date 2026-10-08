"use client";

import { LuTrendingDown, LuTrendingUp, LuTrophy } from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  formatChange,
  formatScore,
  progressHeadline,
  type YearSummary,
} from "@/lib/past-paper-history";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * Previous sittings of one paper: a bar per attempt, the exact scores
 * beneath, and the way back into the paper. Shared by past questions
 * (percentages) and the JAMB CBT (marks out of 400).
 */
export function PastPaperHistoryModal({
  title,
  summary,
  onClose,
  onStart,
}: {
  title: string;
  summary: YearSummary;
  onClose: () => void;
  onStart: () => void;
}) {
  const { attempts, scores, best } = summary;
  const bestIndex = best === null ? -1 : scores.lastIndexOf(best);

  return (
    <Modal
      open
      title={title}
      description={progressHeadline(summary)}
      onClose={onClose}
      footer={
        <Button className="w-full" size="lg" onClick={onStart}>
          {attempts.length >= 3 && best !== null
            ? `Beat your best (${formatScore(summary, best)})`
            : "Take another attempt"}
        </Button>
      }
    >
      <div
        className="flex h-32 items-end gap-2"
        role="img"
        aria-label={`Scores by attempt: ${scores.map((s) => formatScore(summary, s)).join(", ")}`}
      >
        {attempts.map((attempt, i) => (
          <div key={attempt.attemptId} className="flex h-full flex-1 flex-col justify-end">
            <span className="mb-1 text-center text-xs font-semibold text-muted">
              {formatScore(summary, scores[i])}
            </span>
            <div
              className={
                i === bestIndex ? "rounded-t-md bg-success" : "rounded-t-md bg-primary/50"
              }
              style={{ height: `${Math.min(Math.max(attempt.percentage ?? 0, 4), 100)}%` }}
            />
          </div>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-border">
        {attempts.map((attempt, i) => {
          const change = i > 0 ? scores[i] - scores[i - 1] : null;
          return (
            <li key={attempt.attemptId} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="w-20 font-semibold text-foreground">Attempt {i + 1}</span>
              <span className="flex-1 text-muted">
                {dateFormat.format(new Date(attempt.completedAt))}
              </span>
              {i === bestIndex && attempts.length > 1 && (
                <Badge variant="green">
                  <LuTrophy className="h-3 w-3" />
                  Best
                </Badge>
              )}
              {change !== null && change !== 0 && (
                <span
                  className={
                    change > 0
                      ? "flex items-center gap-0.5 text-xs font-semibold text-success"
                      : "flex items-center gap-0.5 text-xs font-semibold text-danger"
                  }
                >
                  {change > 0 ? (
                    <LuTrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <LuTrendingDown className="h-3.5 w-3.5" />
                  )}
                  {formatChange(summary, change)}
                </span>
              )}
              <span className="min-w-12 text-right font-bold text-foreground">
                {formatScore(summary, scores[i])}
              </span>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
