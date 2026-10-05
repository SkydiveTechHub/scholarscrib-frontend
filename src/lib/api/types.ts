/**
 * Response and request types for the ScholarsCrib API, transcribed from the
 * OpenAPI contract (`docs/backend-port/openapi.json`). Loose `object[]` /
 * `additionalProperties` shapes in the contract are given the field sets the
 * existing UI already destructures (the port spec's rule: match the return
 * objects the pages already read; do not invent fields).
 */

// ─── System ───────────────────────────────────────────────────────────────

export type StatusCheck = { status: boolean; detail: string };

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

export type TokenOut = { accessToken: string; user: SessionUserOut };

export type RegisterOut = {
  message: string;
  user: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    classLevel?: string | null;
    track?: string | null;
  };
};

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

export type ProfileUpdateOut = {
  message: string;
  user: Record<string, unknown>;
};

export type CompleteProfileOut = { message: string };
export type MessageOut = { message: string };
export type RevokedOut = { revoked: number };
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

export type TopicSummaryOut = {
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicTitle: string;
  questionCount: number;
};

// ─── Questions ─────────────────────────────────────────────────────────────

/** Public question payload. The contract deliberately omits the answer. */
export type QuestionOut = {
  id: string;
  subjectId?: string | null;
  topicId?: string | null;
  examType?: string | null;
  examYear?: number | null;
  questionNumber?: number | null;
  questionText: string;
  questionType?: string | null;
  options?: Record<string, unknown> | unknown[] | null;
  difficulty?: string | null;
  marks?: number | null;
};

export type QuestionPageOut = {
  questions: QuestionOut[];
  pagination: { page: number; limit: number; total?: number; totalPages?: number };
};

export type PaperOut = Record<string, unknown> & {
  id: string;
  examType?: string | null;
  examYear?: number | null;
  subjectId?: string | null;
  questionCount?: number;
};

export type PapersOut = { papers: PaperOut[] };

// ─── Assessments ───────────────────────────────────────────────────────────

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
};

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

export type BoardAvailableOut = Record<string, unknown> & {
  board: string;
  ready: boolean;
  qualifying: number;
  required: number;
  reason?: string | null;
};

export type BoardsOut = { boards: Record<string, BoardAvailableOut> };

export type MockOptionSubject = Record<string, unknown> & { id: string; name: string; slug?: string };

export type MockOptionsOut = {
  examType: string;
  subjects: MockOptionSubject[];
};

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

export type JambPrepareOut = {
  outcome: string;
  examYear: number;
  ready: boolean;
  message: string;
};

// ─── Flashcards ────────────────────────────────────────────────────────────

export type DeckRefOut = { id: string; title: string; source?: string | null };

export type DeckRow = Record<string, unknown> & { id: string };

export type DecksOut = { decks: DeckRow[] };

export type StudyQueueOut = {
  deck: DeckRefOut;
  queue: Record<string, unknown>[];
  dueCount: number;
  newCount: number;
};

export type FlashcardStatsOut = { stats: Record<string, unknown> };

export type RecommendationsOut = { recommendations: Record<string, unknown>[] };

export type PreviewCard = Record<string, unknown> & { id?: string };

export type PreviewOut = {
  lessonId: string;
  title: string;
  cards: PreviewCard[];
  cardCount: number;
};

export type GeneratedDeckOut = {
  deck: DeckRefOut;
  counts: Record<string, unknown>;
  cardCount: number;
};

export type ReviewOut = { outcome: string; review: Record<string, unknown>; topicId?: string | null };

export type EnrollOut = { deckId: string; enrolled: boolean };

export type DeletedDeckOut = { deckId: string }; // admin-less variant for the client

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

export type PlanCreatedOut = { planId: string };

export type ItemStatusOut = { status: string };

export type ItemRow = Record<string, unknown> & { id: string };

export type ItemStatusPayload = { status: string; item?: ItemRow };

// ─── Lessons ───────────────────────────────────────────────────────────────

export type ProgressOut = { progress: Record<string, unknown> };

// ─── Library ───────────────────────────────────────────────────────────────

export type LibraryOut = { resources: Record<string, unknown>[] };

// ─── Achievements ──────────────────────────────────────────────────────────

export type AchievementsOut = {
  achievements: Record<string, unknown>[];
  earned: number;
};

export type AwardOut = { checked: boolean; newlyEarned: string[]; count: number };

// ─── Learning path ─────────────────────────────────────────────────────────

export type PretestOut = {
  passed?: boolean | null;
  alreadyPassed?: boolean | null;
  percentage?: number | null;
  correctCount?: number | null;
  totalQuestions?: number | null;
  threshold?: number | null;
  assessmentId?: string | null;
  attemptId?: string | null;
  title?: string | null;
  questions?: QuestionOut[] | null;
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
  questionCount: number;
  canonicalLessonId?: string | null;
  createsAttempt?: boolean | null;
  lesson?: Record<string, unknown> | null;
};

export type PracticeResultOut = { result?: Record<string, unknown> | null };

// ─── Billing ───────────────────────────────────────────────────────────────

export type CheckoutOut = { authorizationUrl: string };

// ─── Push ──────────────────────────────────────────────────────────────────

// ─── Admin / Auth ──────────────────────────────────────────────────────────

export type AdminRowOut = {
  id: string;
  email?: string | null;
  username?: string | null;
  isOwner: boolean;
  isActive: boolean;
  lastLoginAt?: string | null;
};

export type AdminTokenOut = { accessToken: string; admin: AdminRowOut };
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

export type SignUploadOut = {
  timestamp: number;
  signature: string;
  folder: string;
  cloudName?: string | null;
  apiKey?: string | null;
  allowedFormats?: string | unknown[] | null;
};

// ─── Admin / Academic terms ────────────────────────────────────────────────

export type TermOut = { id: string; session: string; term: string; startsOn: string; endsOn: string };

// ─── Admin / Announcements ─────────────────────────────────────────────────

export type AnnouncementOut = {
  id: string;
  title: string;
  body: string;
  url?: string | null;
  audience?: Record<string, unknown> | null;
  status?: string | null;
};

export type AnnouncementCreatedOut = { id: string; recipientCount: number };
export type AudiencePreviewOut = { students: number; subscribedStudents: number; devices: number };
export type AnnouncementTestOut = { devices: number; sent: number; student?: string | null };

// ─── Admin / Lessons ───────────────────────────────────────────────────────

export type LessonTreeOut = { subjects: Record<string, unknown>[] };
export type LessonTopicOut = { topicTitle: string; lesson?: Record<string, unknown> | null };
export type LessonImportOut = {
  message: string;
  lessonId: string;
  blockCount: number;
  warnings: unknown[];
};

// ─── Admin / Audit + Stats ─────────────────────────────────────────────────

export type AuditOut = {
  entries: Record<string, unknown>[];
  pagination?: Record<string, unknown> | null;
};

export type StatsOut = { students: number; questions: number; attempts: number };

export type BackfillOut = {
  ledger: Record<string, unknown>;
  wasReset: boolean;
  blockCleared: boolean;
};

// ─── Provider ──────────────────────────────────────────────────────────────

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