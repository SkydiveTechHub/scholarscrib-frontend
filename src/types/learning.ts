// Learning-path shapes as the backend sends them (dashboard, classroom).
// The backend computes every number here; the frontend only displays them.

export type MasteryLevel = "WEAK" | "DEVELOPING" | "COMPETENT" | "STRONG";

export type GapCategory = "WEAK" | "DECAYED" | "BOTTLENECK" | "ABANDONED" | "UNTOUCHED";

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
