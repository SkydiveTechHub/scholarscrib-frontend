/**
 * Response and request types for the ScholarsCrib API, transcribed from the
 * OpenAPI contract (`docs/backend-port/openapi.json`). Loose `object[]` /
 * `additionalProperties` shapes in the contract are given the field sets the
 * existing UI already destructures (the port spec's rule: match the return
 * objects the pages already read; do not invent fields).
 */

// ─── Student / Auth ────────────────────────────────────────────────────────

export type SessionUserOut = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  classLevel?: string | null;
  track?: string | null;
  state?: string | null;
  tier?: string | null;
  image?: string | null;
  deviceId?: string | null;
  role?: string | null;
  hasPassword?: boolean | null;
};

export type SessionOut = { user: SessionUserOut };

export type OkOut = { ok?: boolean };

// ─── Student / User ────────────────────────────────────────────────────────

export type NotificationPreferences = {
  studyReminders: boolean;
  streakReminders: boolean;
  announcements: boolean;
};

export type SettingsProfileOut = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  state?: string | null;
  classLevel?: string | null;
  track?: string | null;
  image?: string | null;
  tier: string;
  tierExpiresAt?: string | null;
  hasPassword: boolean;
  notificationPreferences: NotificationPreferences;
};

export type AvatarOut = { message: string; image: string };

// ─── Subjects ──────────────────────────────────────────────────────────────

export type SubjectCountOut = { topics?: number; questions?: number };

export type SubjectOut = {
  id: string;
  name: string;
  slug: string;
  code?: string | null;
  trackCategory?: string | null;
  isWaec?: boolean | null;
  isJamb?: boolean | null;
  isNeco?: boolean | null;
  _count?: SubjectCountOut | null;
};

export type SubjectsOut = { subjects: SubjectOut[] };

// ─── Assessments ───────────────────────────────────────────────────────────

export type AttemptResultOut = {
  attemptId: string;
  assessmentTitle?: string | null;
  assessmentType?: string | null;
  examYear?: number | null;
  score?: number | null;
  totalMarks?: number | null;
  percentage?: number | null;
  grade?: string | null;
  gradeRemark?: string | null;
  isCredit?: boolean | null;
  totalQuestions?: number | null;
  correctCount?: number | null;
  results?: Record<string, unknown>[];
  topicBreakdown?: Record<string, unknown>[];
};

export type MockOptionSubject = Record<string, unknown> & { id: string; name: string; slug?: string };

export type JambSpecOut = {
  englishQuestions: number;
  subjectQuestions: number;
  totalQuestions: number;
  durationMinutes: number;
  totalMarks: number;
};

/** A subject the question provider carries for JAMB. */
export type JambSubjectOut = {
  id: string;
  name: string;
  slug: string;
  code?: string | null;
  /** The provider's key and category (sciences, arts, commercial, ...). */
  providerKey: string;
  category?: string | null;
  /** Questions it contributes to a sitting: 60 for English, 40 otherwise. */
  questions: number;
  /** Years the provider holds a full paper for, newest first. */
  years: number[];
};

export type JambOptionsOut = {
  spec: JambSpecOut;
  english?: JambSubjectOut | null;
  subjects: JambSubjectOut[];
};

export type JambCoverageOut = {
  subjectId: string;
  subjectName: string;
  code?: string | null;
  required: number;
  available: number;
};

/** A question as the exam routes hand it out: never carries the answer key. */
export type QuestionOut = {
  id: string;
  subjectId?: string | null;
  topicId?: string | null;
  examType?: string | null;
  examYear?: number | null;
  questionNumber?: number | null;
  questionText: string;
  questionImageUrl?: string | null;
  questionType?: string | null;
  options?: Record<string, unknown> | unknown[] | null;
  difficulty?: string | null;
  marks?: number | null;
  passage?: string | null;
  hasPassage?: boolean | null;
  instruction?: string | null;
  subjectName?: string | null;
  subjectCode?: string | null;
};

/** `POST /api/assessments/past-paper`: the paper's first page, as a live attempt. */
export type QuizOut = {
  assessmentId: string;
  attemptId: string;
  title: string;
  source: string;
  totalQuestions: number;
  timeLimitMinutes?: number | null;
  questions: QuestionOut[];
  resumed?: boolean | null;
  deadlineAt?: string | null;
  /** Past papers only: the provider cursor for the paper's next page. */
  nextCursor?: string | null;
};

/** `POST /api/assessments/past-paper/{attemptId}/more` */
export type PastPaperPageOut = {
  questions: QuestionOut[];
  nextCursor?: string | null;
  timeLimitMinutes?: number | null;
  deadlineAt?: string | null;
};

/** `GET /api/questions` page: the listing's cursor, spelled either way. */
export type BankQuestionPageOut = {
  questions: QuestionOut[];
  pagination?: {
    hasMore?: boolean;
    has_more?: boolean;
    nextCursor?: string | null;
    next_cursor?: string | null;
  } | null;
};

/** A subject as the provider's coverage listing spells it. */
export type CoverageSubjectOut = {
  name: string;
  displayName: string;
  category: string;
  examTypes: string[];
  questionCount: number;
  yearRange: { min: number; max: number };
};

/** `GET /api/questions/{questionId}/explanation`. */
export type ExplanationOut = {
  questionId: string;
  /** Markdown; provider explanations already fold in steps and common mistakes. */
  explanation: string;
  simplifiedExplanation?: string | null;
  solutionImageUrl?: string | null;
  source: string;
};

/** `GET /api/questions/coverage/subjects`. */
export type CoverageSubjectsOut = { provider: string; data: CoverageSubjectOut[] };

/** One year of `GET /api/questions/coverage/subjects/{subject}/years`. */
export type CoverageYearOut = {
  year: number;
  questionCount: number;
  examTypes: string[];
  /** Questions per exam key, e.g. `{ jamb: 50, waec: 40 }`. */
  breakdown?: Record<string, number>;
};

export type CoverageYearsOut = { provider: string; data: CoverageYearOut[] };

/** One completed sitting of a past paper. */
export type PastPaperAttemptOut = {
  attemptId: string;
  completedAt: string;
  percentage: number | null;
  score?: number | null;
  totalMarks?: number | null;
};

/** `GET /api/assessments/past-paper/history`: sittings per year, oldest first. */
export type PastPaperHistoryOut = {
  years: { year: number; attempts: PastPaperAttemptOut[] }[];
};

/** One row of `GET /api/questions/past-papers`: a paper on offer. */
export type PastPaper = {
  examType: string;
  examYear: number;
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  trackCategory: string;
  /** Questions already stored; null for a paper only the provider lists. */
  questionCount: number | null;
  cached: boolean;
};

// ─── Flashcards ────────────────────────────────────────────────────────────

export type DeckRow = Record<string, unknown> & { id: string };

export type DecksOut = { decks: DeckRow[] };

export type FlashcardStatsOut = { stats: Record<string, unknown> };

export type RecommendationsOut = { recommendations: Record<string, unknown>[] };

 // admin-less variant for the client

// ─── Study plan ────────────────────────────────────────────────────────────

export type PlanSubjectRow = Record<string, unknown> & { id: string };

export type PlanPageOut = {
  today: string;
  classLevel?: string | null;
  termLabel?: string | null;
  termSource?: string | null;
  daysToExam?: number | null;
  defaults?: Record<string, unknown> | null;
  subjects: PlanSubjectRow[];
  plan?: Record<string, unknown> | null;
};

// ─── Achievements ──────────────────────────────────────────────────────────

export type AchievementsOut = {
  achievements: Record<string, unknown>[];
  earned: number;
};

// ─── Announcements ─────────────────────────────────────────────────────────

export type AnnouncementRow = Record<string, unknown> & { id: string };

export type AnnouncementsOut = { announcements: AnnouncementRow[] };

// ─── Dashboard ─────────────────────────────────────────────────────────────

export type DashboardAttempt = {
  id: string;
  attemptId?: string;
  title?: string | null;
  subjectId?: string | null;
  assessmentType?: string | null;
  percentage?: number | null;
  letter?: string | null;
  completedAt?: string | null;
  subjectName?: string | null;
  score?: number | null;
  totalMarks?: number | null;
};

/** How much evidence backs a topic's mastery figure (see lib/evidence-display). */
export type DashboardEvidence = {
  confidence: number;
  accObservations: number;
  lessonObservations: number;
  srsObservations: number;
  lastStudy: string | null;
};

export type DashboardPick = DashboardEvidence & {
  topicId: string;
  subjectId: string;
  title: string;
  slug: string;
  mastery: number;
  score: number;
  reason: string;
  unlocks: number;
  /** Set when the pick is the lesson the student left unfinished. */
  lessonId: string | null;
};

export type DashboardGap = DashboardEvidence & {
  topicId: string;
  subjectId: string;
  title: string;
  slug: string;
  category: "WEAK" | "DECAYED" | "BOTTLENECK" | "ABANDONED" | "UNTOUCHED";
  mastery: number;
  retention: number | null;
  bottleneckScore: number;
  blockedCount: number;
  abandonedCount: number;
};

export type DashboardRevisionItem = DashboardEvidence & {
  topicId: string;
  subjectId: string;
  title: string;
  slug: string;
  mastery: number;
  retention: number | null;
  priority: number;
  reason: string;
  blockedCount: number;
  dueSrsCards: number;
  cadenceDue: boolean;
};

export type DashboardTodayItem = {
  id: string;
  subjectId: string | null;
  topicId: string | null;
  activityType: string;
  durationMinutes: number;
  status: string;
};

export type DashboardOut = {
  firstName?: string | null;
  streak: number;
  tier: string;
  keepLearning?: Record<string, unknown> | null;
  learningPicks: DashboardPick[];
  gaps: DashboardGap[];
  revision: DashboardRevisionItem[];
  revisionTotal: number;
  /** Subjects referenced by the rails, keyed by subject id. */
  subjects: Record<string, { slug: string; name: string; code: string }>;
  todayItems: DashboardTodayItem[];
  hasStudyPlan: boolean;
  hasActivity: boolean;
  recentAttempts: DashboardAttempt[];
  attemptTotal: number;
  bestScore: number | null;
  lastWeekActivity: number;
  totalResponses: number;
  correctResponses: number;
  accuracy: number | null;
  topicCount: number;
  achievements?: Record<string, unknown> | null;
};

// ─── Performance ───────────────────────────────────────────────────────────

export type PerformanceSubject = Record<string, unknown> & {
  id?: string;
  slug?: string;
  code?: string;
  name?: string;
  accuracy?: number;
  totalAttempted?: number;
  totalCorrect?: number;
};

export type PerformanceOut = {
  attempts: DashboardAttempt[];
  subjects: PerformanceSubject[];
  advanced?: boolean;
  subject?: Record<string, unknown> | null;
  attemptTotal?: number;
};

// ─── Classroom ─────────────────────────────────────────────────────────────

export type ClassroomSubjectRow = Record<string, unknown> & { id?: string; slug: string };

export type ClassroomSubjectsOut = { subjects: ClassroomSubjectRow[] };

export type SubjectPageOut = {
  subject: Record<string, unknown>;
  topics: Record<string, unknown>[];
};

export type CurriculumTopicOut = {
  id: string;
  title: string;
  slug: string;
  orderIndex: number;
  estimatedMinutes?: number | null;
  waecWeight?: number | null;
  jambWeight?: number | null;
};

export type CurriculumLevelOut = {
  classLevel: string;
  term: string;
  topics: CurriculumTopicOut[];
};

/** `GET /api/subjects/{slug}/curriculum` — topics bucketed by class and term. */
export type SubjectCurriculumOut = {
  subject: Record<string, unknown>;
  levels: CurriculumLevelOut[];
};

export type TopicPageOut = {
  subject: Record<string, unknown>;
  topic: Record<string, unknown>;
  colour: string;
  mastery: number | null;
  available: boolean;
  alreadyPassed: boolean;
  attemptedCount: number;
  level?: string | null;
  retention?: number | null;
  confidence?: number | null;
  accObservations?: number;
  lessonObservations?: number;
  srsObservations?: number;
  canonicalLessonId?: string | null;
  createsAttempt?: boolean | null;
  lesson?: Record<string, unknown> | null;
};

export type PracticeResultOut = { result?: Record<string, unknown> | null };

// ─── Billing ───────────────────────────────────────────────────────────────

export type CheckoutOut = { authorizationUrl: string };

// ─── Admin / Auth ──────────────────────────────────────────────────────────

export type AdminRowOut = {
  id: string;
  email?: string | null;
  username?: string | null;
  isOwner: boolean;
  isActive: boolean;
  lastLoginAt?: string | null;
};

export type AdminSessionOut = { admin: AdminRowOut };
export type AdminsOut = { admins: AdminRowOut[] };

// ─── Admin / Students ──────────────────────────────────────────────────────

export type StudentRow = Record<string, unknown> & { id: string };

export type StudentsPageOut = {
  students: StudentRow[];
  pagination?: { page: number; pageSize: number; total?: number } | null;
};

export type StudentDetailOut = {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  classLevel?: string | null;
  track?: string | null;
  tier?: string | null;
};

// ─── Admin / Questions ─────────────────────────────────────────────────────

export type AdminQuestionsOut = {
  questions: Record<string, unknown>[];
  pagination: Record<string, unknown>;
};

export type IdOut = { id: string };
export type UsageOut = { responseCount: number; assessmentCount: number; deletable: boolean };

export type DeleteQuestionsOut = {
  deleted: string[];
  refused: unknown[];
  notFound: string[];
};

export type ImportQuestionsOut = {
  message: string;
  imported: number;
  skipped: number;
  errors: unknown[];
};

// ─── Admin / Materials ─────────────────────────────────────────────────────

export type MaterialOut = {
  id: string;
  subjectId: string;
  title: string;
  description?: string | null;
  resourceType: string;
  url?: string | null;
};

// ─── Admin / Academic terms ────────────────────────────────────────────────

export type TermOut = { id: string; session: string; term: string; startsOn: string; endsOn: string };

// ─── Admin / Lessons ───────────────────────────────────────────────────────

export type LessonTopicOut = { topicTitle: string; lesson?: Record<string, unknown> | null };
export type LessonImportOut = {
  message: string;
  lessonId: string;
  blockCount: number;
  warnings: unknown[];
};

// ─── Errors ────────────────────────────────────────────────────────────────

/** The transport contract's conventional error body. */
export type ApiErrorBody = {
  error?: string;
  details?: Record<string, unknown> | unknown[];
  reason?: string;
  requiredTier?: string;
  feature?: string;
  /** Login over the limit: the client renders "too many attempts". */
  code?: string;
};