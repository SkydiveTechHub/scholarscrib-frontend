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
  emailVerified?: string | null;
};

export type SessionOut = { user: SessionUserOut };

export type OkOut = { ok?: boolean };

// ─── Student / User ────────────────────────────────────────────────────────

export type NotificationPreferences = {
  studyReminders: boolean;
  streakReminders: boolean;
  announcements: boolean;
};

// ─── Student / Notifications ───────────────────────────────────────────────

export type NotificationType = "ANNOUNCEMENT" | "MORNING" | "STREAK";

export type NotificationItemOut = {
  id: string;
  /** Open-ended on the wire: the UI falls back for a type it does not know. */
  type: NotificationType | (string & {});
  title: string;
  body: string;
  url?: string | null;
  readAt?: string | null;
  createdAt?: string | null;
};

export type NotificationsOut = {
  notifications: NotificationItemOut[];
  nextCursor?: string | null;
};

export type UnreadCountOut = { count: number };

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
  /** trialing | active | canceling | past_due | freemium */
  billingStatus?: string | null;
  nextBillingAt?: string | null;
  hasPassword: boolean;
  emailVerified?: string | null;
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
  isActive?: boolean | null;
  _count?: SubjectCountOut | null;
};

export type SubjectsOut = { subjects: SubjectOut[] };

// ─── Assessments ───────────────────────────────────────────────────────────

export type AttemptSharedWithOut = {
  tutorName?: string | null;
  centerName?: string | null;
  assignmentId?: string | null;
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
  /** Present when the attempt was for a tutor assignment (S-2). */
  sharedWith?: AttemptSharedWithOut | null;
  /** BE M2 currently sends this boolean instead of tutor/center names. */
  sharedWithTutor?: boolean | null;
  assignmentId?: string | null;
};

export type MockOptionSubject = Record<string, unknown> & { id: string; name: string; slug?: string };

export type JambSpecOut = {
  englishQuestions: number;
  subjectQuestions: number;
  totalQuestions: number;
  durationMinutes: number;
  totalMarks: number;
};

/** A subject the question provider carries for JAMB. Years load per subject. */
export type JambSubjectOut = {
  id: string;
  name: string;
  slug: string;
  code?: string | null;
  /** The key the provider is asked by (our slug). */
  providerKey: string;
  /** Our track category (CORE, SCIENCE, ...). */
  category?: string | null;
  /** Questions it contributes to a sitting: 60 for English, 40 otherwise. */
  questions: number;
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

/**
 * A subject as the provider-neutral catalogue lists it: ours, keyed by our slug,
 * whichever question provider is active.
 */
export type CatalogueSubjectOut = {
  slug: string;
  name: string;
  displayName: string;
  /** Our track category: CORE, SCIENCE, ARTS, COMMERCIAL or VOCATIONAL. */
  category: string;
  /** The exams (lower-case keys) the subject is offered for. */
  examTypes: string[];
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

/** `GET /api/questions/catalogue/subjects`. */
export type CatalogueSubjectsOut = { provider: string; data: CatalogueSubjectOut[] };

/** One year of `GET /api/questions/catalogue/subjects/{subject}/years`. */
export type CatalogueYearOut = {
  year: number;
  /** Null when the paper is known to exist but nothing is stored to count yet. */
  questionCount: number | null;
  /** Whether the paper is already in our own bank. */
  cached: boolean;
};

export type CatalogueYearsOut = {
  provider: string;
  subject: { slug: string; name: string };
  exam: string;
  /** False while years are still being discovered: asking again may add more. */
  complete: boolean;
  data: CatalogueYearOut[];
};

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
  currentTerm?: string | null;
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

export type DashboardSessionKind =
  | "RETRIEVE"
  | "PRACTICE"
  | "LEARN"
  | "CONTINUE"
  | "MOCK"
  | "PAST";

/** One step of today's session. `doneAt` is an ISO string once finished. */
export type DashboardSessionItem = DashboardEvidence & {
  id: string;
  kind: DashboardSessionKind;
  source: "PLAN" | "ENGINE";
  topicId: string | null;
  subjectId: string | null;
  title: string;
  slug: string | null;
  minutes: number;
  reason: string;
  doneAt: string | null;
  lessonId: string | null;
  dueCards: number;
  planItemId: string | null;
  activityType: string | null;
  mastery: number | null;
  retention: number | null;
  retentionSource: "CARDS" | "ESTIMATE" | null;
  evidenceLevel: "NONE" | "THIN" | "ENOUGH";
};

export type DashboardSession = {
  minutes: number;
  done: number;
  total: number;
  items: DashboardSessionItem[];
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
  session?: DashboardSession | null;
  /** Subjects referenced by today's session items, keyed by subject id. */
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

export type TopicStandingStatus = "strong" | "weak" | "normal" | "emerging";

export type TopicStandingFilter = "all" | "strong" | "weak" | "normal";

export type TopicStanding = {
  topicId: string;
  title: string;
  slug: string;
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  mastery: number;
  level: string;
  status: TopicStandingStatus;
  confidence: number;
  observations: number;
};

export type TopicStandingsOut = {
  topics: TopicStanding[];
  status: TopicStandingFilter;
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
  prerequisites?: Record<string, unknown>[];
  canonicalLessonId?: string | null;
  createsAttempt?: boolean | null;
  lesson?: Record<string, unknown> | null;
};

export type PracticeResultOut = { result?: Record<string, unknown> | null };

// ─── Billing ───────────────────────────────────────────────────────────────

export type CheckoutOut = { authorizationUrl: string };

/** Public catalog row from GET /api/billing/plans. */
export type PublicBillingFeature = {
  code: string;
  enabled: boolean;
  value: unknown;
  gateKey: string | null;
};

export type PublicBillingPlan = {
  code: string;
  tier: string;
  displayName: string;
  amountKobo: number;
  currency: string;
  interval: string;
  isPurchasable: boolean;
  rank: number;
  blurb: string | null;
  features: PublicBillingFeature[];
};

export type PublicBillingPlansOut = { plans: PublicBillingPlan[] };

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

export type CoverageFetchStatus = "PENDING" | "SATURATED" | "FAILED";

/** One populated paper in `GET /admin/api/questions/coverage`. */
export type AdminCoveragePaperOut = {
  examType: string;
  examYear: number;
  count: number;
  /** Provider fill status; null for papers added by hand or imported. */
  fetchStatus: CoverageFetchStatus | null;
};

export type AdminCoverageSubjectOut = {
  subjectId: string;
  name: string;
  code: string;
  total: number;
  /** Newest year first. */
  papers: AdminCoveragePaperOut[];
};

export type AdminQuestionCoverageOut = { subjects: AdminCoverageSubjectOut[] };

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
// ─── Admin / Catalogue (subjects, curriculum levels, topics) ───────────────

export type TrackCategory = "CORE" | "SCIENCE" | "ARTS" | "COMMERCIAL" | "VOCATIONAL";

export type AdminSubjectOut = {
  id: string;
  name: string;
  slug: string;
  code?: string | null;
  isWaec?: boolean | null;
  isJamb?: boolean | null;
  isNeco?: boolean | null;
  isActive?: boolean | null;
  trackCategory?: string | null;
  _count?: { topics: number; questions: number } | null;
};

export type AdminCurriculumOut = {
  id: string;
  subjectId: string;
  classLevel: string;
  term: string;
};

export type AdminTopicOut = {
  id: string;
  subjectId: string;
  curriculumLevelId?: string | null;
  title: string;
  slug: string;
  orderIndex: number;
  estimatedMinutes: number;
  waecWeight: number;
  jambWeight: number;
};

// ─── Tutor Centers (M1) ────────────────────────────────────────────────────

export type CenterPlanCode = "FREE" | "PRO" | "TEAM" | (string & {});

export type CenterMembershipStatus =
  | "INVITED"
  | "ACTIVE"
  | "LEFT"
  | "REMOVED"
  | (string & {});

/** Center staff role on the signed-in tutor's membership (BE lowercase). */
export type CenterStaffRole = "owner" | "facilitator" | (string & {});

export type CenterOut = {
  id: string;
  name: string;
  state?: string | null;
  lga?: string | null;
  subjects?: string[] | null;
  levels?: string[] | null;
  plan?: CenterPlanCode | null;
  planPaidUntil?: string | null;
  ownerId?: string | null;
  /** Present on list/detail when the caller is staff on this center. */
  staffRole?: CenterStaffRole | null;
  activeStudentCount?: number | null;
  activeStudentLimit?: number | null;
  freeStudentLimit?: number | null;
  archivedAt?: string | null;
  createdAt?: string | null;
};

export type CentersListOut = { centers: CenterOut[] };

/** POST /center/api/centers and GET …/centers/{id} wrap the row. */
export type CenterCreateOut = { center: CenterOut };
export type CenterDetailOut = { center: CenterOut };

export type CreateCenterIn = {
  name: string;
  state: string;
  lga: string;
  subjects: string[];
  levels: string[];
};

/** PATCH /center/api/centers/{id} — omitted fields stay unchanged. */
export type UpdateCenterIn = {
  name?: string;
  state?: string | null;
  lga?: string | null;
  subjects?: string[];
  levels?: string[];
};

export type CenterRosterMemberOut = {
  /** FE-preferred; BE roster currently returns `id`. */
  membershipId?: string;
  id?: string;
  userId: string;
  status: CenterMembershipStatus;
  firstName?: string | null;
  lastName?: string | null;
  classLevel?: string | null;
  track?: string | null;
  joinedAt?: string | null;
  groupIds?: string[] | null;
};

export type CenterRosterOut = {
  members: CenterRosterMemberOut[];
  activeCount?: number;
  activeLimit?: number | null;
  plan?: CenterPlanCode | null;
};

export type CenterGroupOut = {
  id: string;
  name: string;
  memberCount?: number;
  membershipIds?: string[];
};

export type CenterGroupsOut = { groups: CenterGroupOut[] };

export type CenterInviteOut = {
  id: string;
  code: string;
  centerId?: string | null;
  /** BE field from `_invite_out` (preferred). */
  link?: string | null;
  /** Absolute or path join URL when the API provides one. */
  url?: string | null;
  /** Present when this invite was emailed to a specific student (R-2). */
  boundEmail?: string | null;
  useLimit?: number | null;
  useCount?: number | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  createdAt?: string | null;
};

export type CreateCenterInviteIn = {
  email?: string;
  expiresInDays?: number | null;
  useLimit?: number | null;
};

export type CenterInvitesOut = { invites: CenterInviteOut[] };

/** POST create/regenerate invite wraps the row. */
export type CenterInviteMutationOut = {
  invite: CenterInviteOut;
  emailSent?: boolean | null;
};

export type CenterInvitePreviewOut = {
  code: string;
  centerId: string;
  centerName: string;
  tutorName: string;
  state?: string | null;
  revoked?: boolean;
  expired?: boolean;
  full?: boolean;
  /** From BE nested consent.version when present. */
  consentVersion?: string | null;
};

/** Body for `POST /api/centers/invites/{code}/accept` (BE AcceptInviteIn). */
export type AcceptCenterInviteIn = {
  accepted: boolean;
  version?: string;
  acknowledgedVisibility?: boolean;
  acknowledgedLeave?: boolean;
  /** Interim D4 attestation; BE may ignore unknown fields. */
  guardianConsentAttested?: boolean;
};

/** @deprecated Prefer AcceptCenterInviteIn + inviteAccept(code). */
export type JoinCenterConsentIn = {
  code: string;
  consent: {
    acknowledgedVisibility: boolean;
    acknowledgedLeave: boolean;
    guardianConsentAttested?: boolean;
  };
};

export type StudentCenterMembershipOut = {
  centerId: string;
  centerName: string;
  tutorName: string;
  state?: string | null;
  joinedAt?: string | null;
  status: CenterMembershipStatus;
  visibilitySummary?: string | null;
};

export type StudentCentersMineOut = {
  centers: StudentCenterMembershipOut[];
};

// ─── Center assignments (M2) ───────────────────────────────────────────────

export type AssignmentLifecycleStatus =
  | "draft"
  | "scheduled"
  | "open"
  | "closed"
  | "DRAFT"
  | "SCHEDULED"
  | "OPEN"
  | "CLOSED"
  | (string & {});

export type AssignmentTaskTypeCode =
  | "TOPIC_QUIZ"
  | "PAST_PAPER"
  | "MOCK_EXAM"
  | "LESSON"
  | "FLASHCARDS"
  | (string & {});

export type AssignmentTargetKindCode =
  | "STUDENT"
  | "GROUP"
  | "CENTER"
  | (string & {});

/** BE stores lowercase reveal / scoring / late policy. */
export type AssignmentRevealAnswers =
  | "immediate"
  | "after_due"
  | "never"
  | (string & {});

export type AssignmentAttemptScoring =
  | "best"
  | "latest"
  | "first"
  | (string & {});

export type AssignmentLatePolicy =
  | "blocked"
  | "accepted_flagged"
  | (string & {});

export type AssignmentTargetIn = {
  kind: AssignmentTargetKindCode;
  /** Membership id (STUDENT) or group id (GROUP). Omit for CENTER. */
  targetId?: string | null;
};

export type AssignmentScopePoint = {
  classLevel: "SS1" | "SS2" | "SS3";
  term: "FIRST" | "SECOND" | "THIRD";
};

export type AssignmentFiltersIn = {
  subjectId?: string | null;
  subjectSlug?: string | null;
  topicIds?: string[] | null;
  /** FE convenience for LESSON deep-links; stored in filters blob. */
  topicSlug?: string | null;
  difficulty?: string | null;
  examType?: string | null;
  examYear?: number | null;
  count?: number | null;
  questionIds?: string[] | null;
  from?: AssignmentScopePoint | null;
  to?: AssignmentScopePoint | null;
  lessonId?: string | null;
};

export type AssignmentSettingsIn = {
  instructions?: string | null;
  timeLimitMinutes?: number | null;
  attemptsAllowed?: number | null;
  attemptScoring?: AssignmentAttemptScoring | null;
  revealAnswers?: AssignmentRevealAnswers | null;
  latePolicy?: AssignmentLatePolicy | null;
  filters?: AssignmentFiltersIn | null;
};

export type AssignmentSettingsOut = AssignmentSettingsIn;

export type AssignmentTargetOut = AssignmentTargetIn;

export type AssignmentQuestionPreviewOut = {
  id: string;
  questionText: string;
  options?: Record<string, string> | null;
  correctAnswer?: string | null;
  difficulty?: string | null;
  examType?: string | null;
  examYear?: number | null;
  topicId?: string | null;
};

export type AssignmentPreviewOut = {
  assessmentId: string;
  totalQuestions: number;
  timeLimitMinutes?: number | null;
  questions: AssignmentQuestionPreviewOut[];
};

export type AssignmentOut = {
  id: string;
  centerId: string;
  title: string;
  taskType: AssignmentTaskTypeCode;
  status: AssignmentLifecycleStatus;
  assessmentId?: string | null;
  settings?: AssignmentSettingsOut | null;
  targets?: AssignmentTargetOut[] | null;
  opensAt?: string | null;
  dueAt?: string | null;
  closedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  center?: { id: string; name: string; state?: string | null } | null;
  tutor?: { id?: string; name?: string | null } | null;
  sharedWith?: AttemptSharedWithOut | null;
  studentStatus?: string | null;
};

export type AssignmentEnvelopeOut = { assignment: AssignmentOut };

export type AssignmentsListOut = { assignments: AssignmentOut[] };

export type CreateAssignmentIn = {
  title: string;
  taskType: AssignmentTaskTypeCode;
  settings?: AssignmentSettingsIn | null;
  filters?: AssignmentFiltersIn | null;
  targets?: AssignmentTargetIn[];
  opensAt?: string | null;
  dueAt?: string | null;
  generate?: boolean;
};

export type GenerateAssignmentIn = {
  filters?: AssignmentFiltersIn | null;
};

export type GenerateAssignmentOut = {
  assignment: AssignmentOut;
  preview?: AssignmentPreviewOut | null;
};

export type UpdateAssignmentIn = {
  title?: string | null;
  instructions?: string | null;
  settings?: AssignmentSettingsIn | null;
  filters?: AssignmentFiltersIn | null;
  targets?: AssignmentTargetIn[] | null;
  opensAt?: string | null;
  dueAt?: string | null;
  generate?: boolean;
};

export type ExtendAssignmentIn = { dueAt: string };

export type StudentAssignedListOut = { assignments: AssignmentOut[] };

/** Start payload: QuizOut fields + assignment decoration. */
export type StartAssignmentOut = {
  assignmentId?: string;
  assessmentId?: string | null;
  attemptId?: string;
  title: string;
  taskType?: AssignmentTaskTypeCode | null;
  source?: string | null;
  totalQuestions?: number | null;
  questions?: QuestionOut[];
  timeLimitMinutes?: number | null;
  deadlineAt?: string | null;
  resumed?: boolean | null;
  nextCursor?: string | null;
  sharedWith?: AttemptSharedWithOut | null;
  settings?: AssignmentSettingsOut | null;
  late?: boolean | null;
  tierBypass?: boolean | null;
};

// ─── Center results + recommendations (M3) ─────────────────────────────────

export type AssignmentResultStudentStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "late"
  | "overdue"
  | (string & {});

export type AssignmentOverviewCounts = {
  notStarted: number;
  inProgress: number;
  submitted: number;
  late: number;
  overdue: number;
};

export type AssignmentScoreBand = {
  band: string;
  count: number;
};

export type AssignmentOverviewOut = {
  assignment: AssignmentOut;
  framing?: { basedOnTasks?: number; label?: string | null } | null;
  counts: AssignmentOverviewCounts;
  targetedStudents: number;
  scores: {
    average: number | null;
    median: number | null;
    highest: number | null;
    lowest: number | null;
    distribution: AssignmentScoreBand[];
  };
  averageTimeSpentSeconds?: number | null;
};

export type FocusLossOut = {
  flagged: boolean;
  awayEvents: number;
};

export type AssignmentStudentRowOut = {
  studentId: string;
  name: string;
  classLevel?: string | null;
  track?: string | null;
  status: AssignmentResultStudentStatus;
  score?: number | null;
  grade?: string | null;
  timeSpentSeconds?: number | null;
  submittedAt?: string | null;
  attemptId?: string | null;
  focusLoss?: FocusLossOut | null;
};

export type AssignmentStudentsOut = {
  assignmentId: string;
  students: AssignmentStudentRowOut[];
  notStarted: AssignmentStudentRowOut[];
  overdue: AssignmentStudentRowOut[];
};

export type AssignmentItemAnalysisRowOut = {
  questionId: string;
  questionText?: string | null;
  topicId?: string | null;
  answered: number;
  correct: number;
  percentCorrect?: number | null;
  mostCommonWrongOption?: string | null;
  averageTimeSeconds?: number | null;
};

export type AssignmentItemAnalysisOut = {
  assignmentId: string;
  attemptCount?: number;
  items: AssignmentItemAnalysisRowOut[];
};

export type ScopedTopicBreakdownOut = {
  topicId: string;
  topicTitle?: string | null;
  correct: number;
  total: number;
  evidenceLevel: "THIN" | "ENOUGH" | (string & {});
  accuracy?: number | null;
  status?: string | null;
  message?: string | null;
};

export type ScopedStudentHistoryOut = {
  assignmentId: string;
  title: string;
  taskType?: AssignmentTaskTypeCode | null;
  score?: number | null;
  grade?: string | null;
  submittedAt?: string | null;
  timeSpentSeconds?: number | null;
  focusLoss?: FocusLossOut | null;
  attemptId?: string | null;
};

export type ScopedStudentDetailOut = {
  student: {
    id: string;
    name: string;
    classLevel?: string | null;
    track?: string | null;
  };
  framing: { basedOnTasks: number; label: string };
  history: ScopedStudentHistoryOut[];
  trend: {
    status?: string | null;
    message?: string | null;
    direction?: string | null;
    delta?: number | null;
    [key: string]: unknown;
  };
  topicBreakdown: ScopedTopicBreakdownOut[];
};

export type RecommendationStatusCode =
  | "delivered"
  | "seen"
  | "acted"
  | "DELIVERED"
  | "SEEN"
  | "ACTED"
  | (string & {});

export type RecommendationAttachmentsOut = {
  topicIds?: string[] | null;
  lessonId?: string | null;
  practiceSetId?: string | null;
  assignmentId?: string | null;
};

export type RecommendationOut = {
  id: string;
  centerId: string;
  assignmentId?: string | null;
  authorId: string;
  studentId: string;
  body: string;
  attachments?: RecommendationAttachmentsOut | null;
  status: RecommendationStatusCode;
  createdAt?: string | null;
  updatedAt?: string | null;
  center?: { id: string; name: string } | null;
  author?: { id?: string; name?: string | null } | null;
};

export type RecommendationsListOut = { recommendations: RecommendationOut[] };

export type CreateRecommendationIn = {
  body: string;
  studentId?: string | null;
  groupId?: string | null;
  toCenter?: boolean;
  assignmentId?: string | null;
  attachments?: RecommendationAttachmentsOut | null;
};

export type CreateRecommendationsOut = {
  recommendations: RecommendationOut[];
  delivered: number;
};

export type UpdateRecommendationStatusIn = {
  status: "seen" | "acted";
};

// ─── Center billing (M4) ───────────────────────────────────────────────────

/** Catalog row nested under center billing status (Pro / Team). */
export type CenterPlanOffer = {
  code?: string | null;
  displayName?: string | null;
  amountKobo: number;
  interval?: string | null;
  purchasable?: boolean | null;
  maxFacilitators?: number | null;
  maxStaff?: number | null;
};

/** Inner payload from GET /center/api/centers/{id}/billing. */
export type CenterBillingStatus = {
  plan: CenterPlanCode;
  planPaidUntil?: string | null;
  activeStudentCount?: number | null;
  freeStudentLimit?: number | null;
  atFreeCap?: boolean | null;
  facilitatorCount?: number | null;
  maxFacilitators?: number | null;
  maxStaff?: number | null;
  pro?: CenterPlanOffer | null;
  team?: CenterPlanOffer | null;
  /** M6: token pool snapshot embedded on billing status. */
  tokens?: {
    balance: number;
    tokensPerTurn?: number | null;
    packs?: CenterTokenPackOut[] | null;
  } | null;
};

export type CenterBillingOut = {
  billing: CenterBillingStatus;
};

export type CenterCheckoutIn = {
  plan?: "PRO" | "TEAM" | string;
};

// ─── Center facilitators / Team (M5) ───────────────────────────────────────

export type CenterFacilitatorSeats = {
  maxFacilitators: number;
  maxStaff?: number | null;
  used: number;
};

export type CenterFacilitatorMemberOut = {
  id: string;
  centerId?: string | null;
  userId: string;
  kind?: string | null;
  status: CenterMembershipStatus | string;
  joinedAt?: string | null;
  leftAt?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  image?: string | null;
};

export type CenterFacilitatorInviteOut = {
  id: string;
  centerId?: string | null;
  kind?: string | null;
  code: string;
  token?: string | null;
  /** Absolute invite URL from BE (`/center/join-team/{code}`). */
  link?: string | null;
  url?: string | null;
  boundEmail?: string | null;
  useLimit?: number | null;
  useCount?: number | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  createdAt?: string | null;
};

export type CenterFacilitatorsOut = {
  centerId: string;
  plan?: CenterPlanCode | null;
  staffRole?: CenterStaffRole | null;
  canManage?: boolean | null;
  facilitators: CenterFacilitatorMemberOut[];
  pendingInvites: CenterFacilitatorInviteOut[];
  seats: CenterFacilitatorSeats;
};

export type InviteFacilitatorIn = {
  email?: string | null;
  expiresInDays?: number | null;
};

export type InviteFacilitatorOut = {
  invite: CenterFacilitatorInviteOut;
  seats?: CenterFacilitatorSeats | null;
};

export type FacilitatorInvitePreviewOut = {
  invite: {
    code: string;
    kind?: string | null;
    expiresAt?: string | null;
    boundEmail?: string | null;
  };
  center: {
    id: string;
    name: string;
    state?: string | null;
    plan?: CenterPlanCode | null;
  };
  owner: {
    firstName?: string | null;
    lastName?: string | null;
    state?: string | null;
  };
  permissions?: {
    can?: string[] | null;
    cannot?: string[] | null;
  } | null;
};

export type AcceptFacilitatorInviteOut = {
  membership: CenterFacilitatorMemberOut;
  center: CenterOut;
  owner?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  alreadyMember?: boolean | null;
};

export type CenterBillingVerifyOut = {
  outcome?: string | null;
  center?: {
    id: string;
    plan?: CenterPlanCode | null;
    planPaidUntil?: string | null;
  } | null;
};

// ─── Center AI tokens (M6) ─────────────────────────────────────────────────

/** Inner pool from GET /center/api/centers/{id}/tokens (and billing.tokens). */
export type CenterTokenPool = {
  centerId?: string | null;
  balance: number;
  tokensPerTurn?: number | null;
  updatedAt?: string | null;
};

export type CenterTokenPackOut = {
  /** Catalog code used at checkout (`packCode`). */
  code: string;
  label: string;
  tokens: number;
  amountKobo: number;
  currency?: string | null;
  purchasable?: boolean | null;
};

/** GET /center/api/centers/{id}/tokens */
export type CenterTokenBalanceOut = {
  pool: CenterTokenPool;
  packs?: CenterTokenPackOut[];
  ledger?: unknown[];
  /** Flat balance when a thinner payload is returned. */
  balance?: number | null;
};

export type CenterTokenPacksOut = {
  packs: CenterTokenPackOut[];
};

export type CenterTokenCheckoutIn = {
  packCode: string;
};

export type CenterTokenCheckoutOut = {
  authorizationUrl: string;
  reference?: string | null;
  pack?: CenterTokenPackOut | null;
};

export type CenterTokenVerifyOut = {
  outcome?: string | null;
  pool?: CenterTokenPool | null;
  balance?: number | null;
};

// ─── Owner referral wallet (M7) ────────────────────────────────────────────

export type TutorWalletLedgerKind =
  | "COMMISSION"
  | "REFUND_REVERSE"
  | "SPEND_TOKENS"
  | "WITHDRAW_HOLD"
  | "WITHDRAW_REJECT"
  | "ADJUSTMENT"
  | string;

export type TutorWithdrawStatus =
  | "PENDING"
  | "FULFILLED"
  | "REJECTED"
  | "CANCELLED"
  | string;

export type TutorWalletOut = {
  id?: string | null;
  ownerId?: string | null;
  balanceKobo: number;
  currency?: string | null;
  minWithdrawKobo?: number | null;
  commissionBps?: number | null;
  canWithdraw?: boolean | null;
  tutorVerified?: boolean | null;
  pendingWithdrawKobo?: number | null;
  updatedAt?: string | null;
};

export type TutorWalletLedgerEntryOut = {
  id: string;
  kind: TutorWalletLedgerKind;
  deltaKobo: number;
  balanceAfterKobo?: number | null;
  centerId?: string | null;
  centerName?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  subscriptionId?: string | null;
  reference?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
};

export type TutorWalletPayoutDetails = {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName?: string | null;
  note?: string | null;
};

export type TutorWithdrawRequestOut = {
  id: string;
  ownerId?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  amountKobo: number;
  status: TutorWithdrawStatus;
  payoutDetails?: TutorWalletPayoutDetails | Record<string, unknown> | null;
  note?: string | null;
  resolutionNote?: string | null;
  resolvedAt?: string | null;
  resolvedById?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

/** GET /center/api/wallet (or centers/{id}/wallet). */
export type TutorWalletStatusOut = {
  wallet: TutorWalletOut;
  ledger?: TutorWalletLedgerEntryOut[] | null;
  withdrawals?: TutorWithdrawRequestOut[] | null;
  packs?: CenterTokenPackOut[] | null;
};

export type TutorWalletLedgerOut = {
  entries: TutorWalletLedgerEntryOut[];
  ledger?: TutorWalletLedgerEntryOut[];
  total?: number | null;
};

export type TutorWalletSpendIn = {
  packCode: string;
};

export type TutorWalletSpendOut = {
  wallet?: TutorWalletOut | null;
  ledgerEntry?: TutorWalletLedgerEntryOut | null;
  tokens?: {
    centerId?: string | null;
    balance?: number | null;
    credited?: number | null;
    packCode?: string | null;
  } | null;
  pool?: CenterTokenPool | null;
  pack?: CenterTokenPackOut | null;
  entry?: TutorWalletLedgerEntryOut | null;
  balanceKobo?: number | null;
};

export type TutorWalletWithdrawIn = {
  amountKobo: number;
  payoutDetails: TutorWalletPayoutDetails;
  note?: string | null;
};

export type TutorWalletWithdrawOut = {
  withdrawal: TutorWithdrawRequestOut;
  wallet?: TutorWalletOut | null;
};

export type TutorWalletWithdrawalsOut = {
  withdrawals: TutorWithdrawRequestOut[];
  total?: number | null;
  pagination?: { page: number; pageSize: number; total: number };
};

export type AdminWithdrawOwnerOut = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  tutorVerifiedAt?: string | null;
};

export type AdminWithdrawRequestOut = TutorWithdrawRequestOut & {
  owner?: AdminWithdrawOwnerOut | null;
};

export type AdminWithdrawalsPageOut = {
  items: AdminWithdrawRequestOut[];
  withdrawals?: AdminWithdrawRequestOut[];
  requests?: AdminWithdrawRequestOut[];
  page?: number;
  pageSize?: number;
  total?: number | null;
  pagination?: { page: number; pageSize: number; total: number };
};

export type AdminWithdrawResolveIn = {
  fulfil: boolean;
  note?: string | null;
};

// ─── Admin centers (M4) ────────────────────────────────────────────────────

export type AdminCenterOwnerOut = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean | null;
  emailVerified?: string | boolean | null;
  tutorVerifiedAt?: string | null;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
};

export type AdminCenterRowOut = {
  id: string;
  name: string;
  state?: string | null;
  lga?: string | null;
  plan?: CenterPlanCode | null;
  planPaidUntil?: string | null;
  activeStudentCount?: number | null;
  archivedAt?: string | null;
  createdAt?: string | null;
  owner?: AdminCenterOwnerOut | null;
  ownerId?: string | null;
};

export type AdminCentersPageOut = {
  centers: AdminCenterRowOut[];
  pagination?: { page: number; pageSize: number; total: number };
  total?: number;
};

export type AdminCenterDetailOut = AdminCenterRowOut & {
  subjects?: string[] | null;
  levels?: string[] | null;
  openAssignmentCount?: number | null;
};

export type AdminTutorRowOut = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  isActive: boolean;
  emailVerified?: string | boolean | null;
  tutorVerifiedAt?: string | null;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
  centerCount?: number | null;
  createdAt?: string | null;
  lastActiveAt?: string | null;
  centers?: AdminCenterRowOut[] | null;
};

export type AdminTutorsPageOut = {
  tutors: AdminTutorRowOut[];
  pagination?: { page: number; pageSize: number; total: number };
  total?: number;
};

export type AdminTutorDetailOut = AdminTutorRowOut;

export type AdminCenterReportOut = {
  id: string;
  kind: string;
  status: string;
  reason: string;
  targetId?: string | null;
  centerId?: string | null;
  centerName?: string | null;
  reporterId?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
};

export type AdminCenterReportsPageOut = {
  reports: AdminCenterReportOut[];
  pagination?: { page: number; pageSize: number; total: number };
  total?: number;
};

export type AdminTutorAccessAuditOut = {
  id: string;
  actorId: string;
  actorName?: string | null;
  centerId: string;
  centerName?: string | null;
  studentId?: string | null;
  action: string;
  resource?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminTutorAccessAuditPageOut = {
  /** BE returns `audits`; accept `entries` as an alias. */
  audits?: AdminTutorAccessAuditOut[];
  entries?: AdminTutorAccessAuditOut[];
  pagination?: { page: number; pageSize: number; total: number };
  total?: number;
};
