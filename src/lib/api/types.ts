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

export type SettingsDevice = {
  id: string;
  label?: string | null;
  lastSeenAt?: string | null;
  current?: boolean;
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
  devices: SettingsDevice[];
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

export type JambOptionsOut = {
  spec: JambSpecOut;
  english?: Record<string, unknown> | null;
  englishYears: number[];
  subjects: MockOptionSubject[];
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
  title?: string | null;
  percentage?: number | null;
  completedAt?: string | null;
  subjectName?: string | null;
  score?: number | null;
  totalMarks?: number | null;
};

export type DashboardOut = {
  firstName?: string | null;
  streak?: number;
  tier?: string;
  keepLearning?: Record<string, unknown> | null;
  gaps?: Record<string, unknown>[];
  todayItems: Record<string, unknown>[];
  recentAttempts: DashboardAttempt[];
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

export type TopicPageOut = {
  subject: Record<string, unknown>;
  topic: Record<string, unknown>;
  colour: string;
  mastery: number | null;
  available: boolean;
  alreadyPassed: boolean;
  questionCount: number;
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