import type { Difficulty, EdgeKind } from "@/types/prisma";
import type { LearningEventKind } from "./fold";

// Structural, minimal models for the slices of the database the learning
// engines read. The engines were ported verbatim to the FastAPI backend and
// run there against Prisma; this app imports them only as logic/type oracles,
// so no `@prisma/client` dependency is kept here.

export type TopicRow = {
  id: string;
  subjectId: string;
  title: string;
  slug: string;
  orderIndex: number;
  estimatedMinutes: number;
  waecWeight: number;
  jambWeight: number;
  prerequisiteTopicId: string | null;
};

export type TopicEdgeRow = {
  id: string;
  prereqTopicId: string;
  topicId: string;
  kind: EdgeKind;
  strength: number;
  rationale: string | null;
};

export type LessonRow = {
  id: string;
  subtopicId: string;
  title: string;
  prerequisites: unknown;
};

export type StudentProgressRow = {
  lessonId: string | null;
  topicId: string | null;
  revisionDueAt: Date | null;
};

export type TopicMasteryRow = {
  topicId: string;
  scoringVersion: string | number;
  accWeightedOutcome: number;
  accWeightedMass: number;
  lessonWeightedOutcome: number;
  lessonWeightedMass: number;
  srsWeightedOutcome: number;
  srsWeightedMass: number;
  accObservations: number;
  lessonObservations: number;
  srsObservations: number;
  decayAnchor: Date;
  cursorSeq: bigint;
  lastEffortAt: Date | null;
};

export type LearningEventRow = {
  seq: bigint;
  topicId: string | null;
  kind: LearningEventKind;
  correct: boolean | null;
  score: number | null;
  difficulty: Difficulty | null;
  seconds: number | null;
  occurredAt: Date;
};

export type PerformanceMetricRow = {
  topicId: string | null;
};

export type RevisionReviewRow = {
  flashcard: {
    deck: {
      topicId: string | null;
      lesson: { subtopic: { topicId: string | null } } | null;
    };
  };
};

export interface EngineDb {
  topic: {
    findMany: (args: unknown) => Promise<TopicRow[]>;
  };
  topicEdge: {
    findMany: (args: unknown) => Promise<TopicEdgeRow[]>;
    createMany: (args: unknown) => Promise<unknown>;
  };
  topicMastery: {
    findMany: (args: unknown) => Promise<TopicMasteryRow[]>;
    upsert: (args: unknown) => Promise<unknown>;
  };
  learningEvent: {
    findMany: (args: unknown) => Promise<LearningEventRow[]>;
  };
  performanceMetric: {
    findMany: (args: unknown) => Promise<PerformanceMetricRow[]>;
  };
  studentProgress: {
    findMany: (args: unknown) => Promise<StudentProgressRow[]>;
    count: (args: unknown) => Promise<number>;
  };
  lesson: {
    findUnique: (args: unknown) => Promise<LessonRow | null>;
    findMany: (args: unknown) => Promise<LessonRow[]>;
  };
  flashcardReview: {
    findMany: (args: unknown) => Promise<RevisionReviewRow[]>;
  };
} 