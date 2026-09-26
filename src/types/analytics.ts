// Performance-analytics shapes as the backend sends them (`GET /api/performance`).

import type { GapCategory } from "./learning";

export type InsightSeverity = "CRITICAL" | "WARNING" | "INFO" | "WIN";

export type InsightKind =
  | "UNTOUCHED_SUBJECT"
  | "LOW_COVERAGE"
  | "WEAK_TOPIC"
  | "DECAYED_TOPIC"
  | "STALE_TOPIC"
  | "BOTTLENECK_TOPIC"
  | "RAPID_GUESSING"
  | "PACING_SLOW"
  | "PACING_RUSHED"
  | "DIFFICULTY_DRIFT"
  | "IMPROVING"
  | "PLATEAU"
  | "SLIPPING"
  | "INSUFFICIENT_EVIDENCE";

export type Insight = {
  kind: InsightKind;
  severity: InsightSeverity;
  subjectId?: string;
  topicId?: string;
  /** One plain sentence; renders as-is. */
  headline: string;
  detail?: string;
  action?: { label: string; href: string };
};

export type DifficultyBand = {
  difficulty: "BASIC" | "INTERMEDIATE" | "ADVANCED" | "UNLABELLED";
  answered: number;
  /** Percentage, 0..100. */
  accuracy: number;
};

export type Pacing = {
  meanSeconds: number;
  expectedSeconds: number;
  /** meanSeconds / expectedSeconds. */
  ratio: number;
  verdict: "RUSHED" | "ON_PACE" | "SLOW";
};

export type Profile =
  | { status: "insufficient"; answered: number; needed: number }
  | {
      status: "ok";
      answered: number;
      bands: DifficultyBand[];
      /** Percentage of answers that were rapid guesses, 0..100. */
      rapidGuessRate: number;
      /** Null when nothing can be said. */
      pacing: Pacing | null;
    };

export type TopicGroupKey =
  | "NEEDS_WORK"
  | "NEEDS_REVISION"
  | "UNPROVEN"
  | "COMING_ALONG"
  | "SOLID";

export type TopicRow = {
  topicId: string;
  subjectId: string;
  title: string;
  slug: string;
  group: TopicGroupKey;
  /** The underlying category, or null when the backend withheld judgement. */
  category: GapCategory | null;
  mastery: number;
  retention: number | null;
  confidence: number;
  observations: number;
  accObservations: number;
  lessonObservations: number;
  srsObservations: number;
  bottleneckScore: number;
  /** ISO string. */
  lastStudy: string | null;
  /** SOLID only: retention has slipped but not far enough to be DECAYED. */
  stale: boolean;
};

export type TopicGroups = Record<TopicGroupKey, TopicRow[]>;
