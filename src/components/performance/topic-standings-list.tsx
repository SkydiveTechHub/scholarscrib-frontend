import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { TopicStanding, TopicStandingStatus } from "@/lib/api/types";

const STATUS_BADGE: Record<
  TopicStandingStatus,
  { label: string; variant: "red" | "green" | "blue" | "amber" }
> = {
  weak: { label: "Weak", variant: "red" },
  strong: { label: "Strong", variant: "green" },
  normal: { label: "Normal", variant: "blue" },
  emerging: { label: "Emerging", variant: "amber" },
};

function rowHref(
  status: TopicStandingStatus,
  subjectSlug: string,
  topicSlug: string,
): string {
  return status === "weak"
    ? `/practice/past-questions?topic=${topicSlug}`
    : `/classroom/${subjectSlug}/${topicSlug}`;
}

/**
 * Flat topic rows from GET /api/performance/topics.
 * Status bands are server-owned; this only presents them.
 */
export function TopicStandingsList({
  topics,
  subjectSlug,
}: {
  topics: TopicStanding[];
  subjectSlug: string;
}) {
  if (topics.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted">
        No topic standings yet. Keep answering questions — standings update shortly
        after each assessment.
      </p>
    );
  }

  return (
    <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {topics.map((row) => {
        const badge = STATUS_BADGE[row.status];
        return (
          <li key={row.topicId}>
            <Link
              href={rowHref(row.status, subjectSlug, row.slug)}
              className="block rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-foreground">
                  {row.title}
                </span>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </span>
              {row.observations === 0 ? (
                <span className="mt-1.5 block text-xs text-muted">
                  Not started yet
                </span>
              ) : (
                <>
                  <span className="mt-1.5 block text-xs text-muted">
                    {Math.round(row.mastery)}% mastery · {row.observations} answered
                  </span>
                  <span className="mt-1.5 block">
                    <Progress value={Math.round(row.mastery)} tone="auto" />
                  </span>
                </>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
