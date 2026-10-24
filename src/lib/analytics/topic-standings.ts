import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import type {
  TopicStanding,
  TopicStandingFilter,
  TopicStandingStatus,
  TopicStandingsOut,
} from "@/lib/api/types";

const STATUS_ORDER: Record<TopicStandingStatus, number> = {
  weak: 0,
  normal: 1,
  strong: 2,
  emerging: 3,
};

function isStatus(value: unknown): value is TopicStandingStatus {
  return (
    value === "strong" ||
    value === "weak" ||
    value === "normal" ||
    value === "emerging"
  );
}

function isFilter(value: unknown): value is TopicStandingFilter {
  return (
    value === "all" ||
    value === "strong" ||
    value === "weak" ||
    value === "normal"
  );
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asTopicStanding(row: unknown): TopicStanding | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const topicId = str(r.topicId);
  if (!topicId) return null;
  const status = isStatus(r.status) ? r.status : "emerging";
  const mastery = num(r.mastery);
  return {
    topicId,
    title: str(r.title),
    slug: str(r.slug),
    subjectId: str(r.subjectId),
    subjectName: str(r.subjectName),
    subjectSlug: str(r.subjectSlug),
    mastery: mastery > 0 && mastery <= 1 ? mastery * 100 : mastery,
    level: str(r.level),
    status,
    confidence: num(r.confidence),
    observations: Math.floor(num(r.observations)),
  };
}

/** Sort for the subjects Topics list: weak first, then by mastery ascending. */
export function sortTopicStandings(topics: TopicStanding[]): TopicStanding[] {
  return [...topics].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    return a.mastery - b.mastery;
  });
}

/**
 * Topic standings for the performance UI.
 * Bands come from the server — do not recompute strong/weak/normal on the client.
 */
export async function getTopicStandings(opts: {
  subjectId: string;
  status?: TopicStandingFilter;
  limit?: number;
}): Promise<TopicStandingsOut> {
  const status = opts.status ?? "all";
  const limit = Math.min(100, Math.max(1, opts.limit ?? 100));
  const data = await api<TopicStandingsOut>(endpoints.performanceTopics, {
    params: {
      status,
      subjectId: opts.subjectId,
      limit,
    },
  });

  const topics = sortTopicStandings(
    (data.topics ?? [])
      .map(asTopicStanding)
      .filter((row): row is TopicStanding => row !== null),
  );

  return {
    topics,
    status: isFilter(data.status) ? data.status : status,
  };
}
