// Learning-path shapes as the backend sends them (dashboard, classroom).
// The backend computes every number here; the frontend only displays them.

export type MasteryLevel = "WEAK" | "DEVELOPING" | "COMPETENT" | "STRONG";

export type GapCategory = "WEAK" | "DECAYED" | "BOTTLENECK" | "ABANDONED" | "UNTOUCHED";

/** Raw evidence counts behind a mastery number. `lastStudy` is an ISO string. */
type EvidenceFields = {
  confidence: number;
  accObservations: number;
  lessonObservations: number;
  srsObservations: number;
  lastStudy: string | null;
};

export interface TopicGap extends EvidenceFields {
  topicId: string;
  subjectId: string;
  title: string;
  slug: string;
  category: GapCategory;
  mastery: number;
  retention: number | null;
  /** Sum of exam weight over every reachable dependent. */
  bottleneckScore: number;
  /** Number of direct dependents still below the mastery target. */
  blockedCount: number;
  /** Times this topic appeared in a quiz the student started and never finished. */
  abandonedCount: number;
}

export interface RecommendationFactors {
  urgency: number;
  leverage: number;
  decay: number;
  readiness: number;
  freshness: number;
}

export interface NextTopicRecommendation extends EvidenceFields {
  topicId: string;
  subjectId: string;
  title: string;
  slug: string;
  mastery: number;
  score: number;
  reason: string;
  factors: RecommendationFactors;
  /** Number of unmastered dependent topics this unlocks. */
  unlocks: number;
}

/** The reason line the backend gives a pick that came from the student's own lessons. */
export const CONTINUE_REASON = "Continue where you left off";

export interface RevisionQueueItem extends EvidenceFields {
  topicId: string;
  subjectId: string;
  title: string;
  slug: string;
  mastery: number;
  retention: number | null;
  priority: number;
  /** One-line human reason, shown on the card. */
  reason: string;
  blockedCount: number;
  dueSrsCards: number;
  cadenceDue: boolean;
}

export interface PrereqStatus {
  topicId: string;
  subjectId: string;
  title: string;
  slug: string;
  /** Mastery (0..100) the prerequisite must reach to unlock. */
  need: number;
  /** The student's current mastery of the prerequisite. */
  mastery: number;
  met: boolean;
  rationale: string | null;
}

export interface TopicState {
  topicId: string;
  /** Composite 0..100. */
  mastery: number;
  level: MasteryLevel;
  /** Probability the topic is recallable now (0..1), or null if untouched. */
  retention: number | null;
  /** Memory strength in days. */
  stability: number;
  /** How much of `mastery` comes from data rather than the prior (0..1). */
  confidence: number;
  acc: number | null;
  lessonM: number | null;
  srs: number | null;
  lastStudy: Date | null;
  accObservations: number;
  lessonObservations: number;
  srsObservations: number;
}
