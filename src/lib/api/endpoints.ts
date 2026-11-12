/**
 * Every backend route the app calls, in one place. Client hooks and the
 * server transport both read paths from here; components never spell out a
 * URL. Routes with ids are functions so the id is always encoded.
 */
const seg = (value: string) => encodeURIComponent(value);

export const endpoints = {
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
    logout: "/api/auth/logout",
    session: "/api/auth/session",
    google: "/api/auth/google",
    googleTokens: "/api/auth/google/tokens",
    forgotPassword: "/api/auth/forgot-password",
    resetPassword: "/api/auth/reset-password",
    otpSend: "/api/auth/otp/send",
    otpVerify: "/api/auth/otp/verify",
  },
  user: {
    profile: "/api/user/profile",
    completeProfile: "/api/user/complete-profile",
    password: "/api/user/password",
    notificationPreferences: "/api/user/notification-preferences",
    avatar: "/api/user/avatar",
    deleteAccount: "/api/user/account/delete",
  },
  subjects: {
    list: "/api/subjects",
  },
  questions: {
    list: "/api/questions",
    pastPapers: "/api/questions/past-papers",
    topicQuiz: "/api/questions/topic-quiz",
    topicAnswers: "/api/questions/topic-answers",
    explanation: (questionId: string) => `/api/questions/${seg(questionId)}/explanation`,
    catalogueSubjects: "/api/questions/catalogue/subjects",
    catalogueSubjectYears: (subject: string) =>
      `/api/questions/catalogue/subjects/${seg(subject)}/years`,
  },
  assessments: {
    generate: "/api/assessments/generate",
    submit: "/api/assessments/submit",
    attempt: (attemptId: string) => `/api/assessments/attempts/${seg(attemptId)}`,
    mockExam: {
      boards: "/api/assessments/mock-exam/boards",
      options: "/api/assessments/mock-exam/options",
      scoped: "/api/assessments/mock-exam/scoped",
    },
    pastPaper: "/api/assessments/past-paper",
    pastPaperHistory: "/api/assessments/past-paper/history",
    pastPaperMore: (attemptId: string) =>
      `/api/assessments/past-paper/${seg(attemptId)}/more`,
    jambCbt: {
      options: "/api/assessments/jamb-cbt/options",
      history: "/api/assessments/jamb-cbt/history",
      prepare: "/api/assessments/jamb-cbt/prepare",
      generate: "/api/assessments/jamb-cbt/generate",
    },
  },
  flashcards: {
    list: "/api/flashcards",
    stats: "/api/flashcards/stats",
    recommendations: "/api/flashcards/recommendations",
    preview: "/api/flashcards/preview",
    generate: "/api/flashcards/generate",
    review: "/api/flashcards/review",
    deck: (deckId: string) => `/api/flashcards/decks/${seg(deckId)}`,
    enroll: (deckId: string) => `/api/flashcards/decks/${seg(deckId)}/enroll`,
  },
  tutor: {
    threads: "/api/tutor/threads",
    threadsStream: "/api/tutor/threads/stream",
    thread: (threadId: string) => `/api/tutor/threads/${seg(threadId)}`,
    messages: (threadId: string) =>
      `/api/tutor/threads/${seg(threadId)}/messages`,
    messagesStream: (threadId: string) =>
      `/api/tutor/threads/${seg(threadId)}/messages/stream`,
    messagesStop: (threadId: string) =>
      `/api/tutor/threads/${seg(threadId)}/messages/stream/stop`,
    runStream: (threadId: string, runId: string) =>
      `/api/tutor/threads/${seg(threadId)}/runs/${seg(runId)}/stream`,
    actionsResume: (threadId: string) =>
      `/api/tutor/threads/${seg(threadId)}/actions/resume`,
    feedback: (messageId: string) =>
      `/api/tutor/messages/${seg(messageId)}/feedback`,
  },
  studyPlan: {
    root: "/api/study-plan",
    detail: (planId: string) => `/api/study-plan/${seg(planId)}`,
    positions: "/api/study-plan/positions",
    preview: "/api/study-plan/preview",
    item: (itemId: string) => `/api/study-plan/items/${seg(itemId)}`,
  },
  lessons: {
    progress: (lessonId: string) => `/api/lessons/${seg(lessonId)}/progress`,
    tutor: (lessonId: string) => `/api/lessons/${seg(lessonId)}/tutor`,
  },
  learningPath: {
    pretest: (topicId: string) => `/api/learning-path/topics/${seg(topicId)}/pretest`,
  },
  library: "/api/library",
  achievements: "/api/achievements",
  gamificationProfile: "/api/gamification/profile",
  gamificationQuests: "/api/gamification/quests",
  gamificationStreak: "/api/gamification/streak",
  gamificationImprovement: "/api/gamification/improvement",
  announcements: {
    list: "/api/announcements",
    dismiss: (id: string) => `/api/announcements/${seg(id)}/dismiss`,
  },
  notifications: {
    list: "/api/notifications",
    unreadCount: "/api/notifications/unread-count",
    readAll: "/api/notifications/read-all",
    read: (id: string) => `/api/notifications/${seg(id)}/read`,
  },
  dashboard: "/api/dashboard",
  performance: "/api/performance",
  performanceTopics: "/api/performance/topics",
  classroom: {
    subjects: "/api/classroom/subjects",
    subject: (slug: string) => `/api/classroom/subjects/${seg(slug)}`,
    curriculum: (slug: string) => `/api/subjects/${seg(slug)}/curriculum`,
    topic: (slug: string, topicSlug: string, suffix = "") =>
      `/api/classroom/subjects/${seg(slug)}/topics/${seg(topicSlug)}${suffix}`,
  },
  billing: {
    plans: "/api/billing/plans",
    checkout: "/api/billing/checkout",
    cancel: "/api/billing/cancel",
    resume: "/api/billing/resume",
    verify: "/api/billing/verify",
  },
  push: {
    subscription: "/api/push/subscription",
  },
  /**
   * Student-facing center features (`/api/centers/*`): join, my centers, leave.
   */
  centers: {
    /** My centers (active + left/removed history). BE: GET /api/centers */
    mine: "/api/centers",
    /** Preview an invite by short code (anonymous or student). */
    invitePreview: (code: string) => `/api/centers/invites/${seg(code)}`,
    /** Accept invite with consent payload. */
    inviteAccept: (code: string) =>
      `/api/centers/invites/${seg(code)}/accept`,
    leave: (centerId: string) => `/api/centers/${seg(centerId)}/leave`,
    /** Student Assigned inbox (S-6). BE: GET /api/centers/assigned */
    assigned: "/api/centers/assigned",
    assignment: (assignmentId: string) =>
      `/api/centers/assignments/${seg(assignmentId)}`,
    assignmentStart: (assignmentId: string) =>
      `/api/centers/assignments/${seg(assignmentId)}/start`,
    /** Tutor recommendations inbox (C-2). */
    recommendations: "/api/centers/recommendations",
    /** PATCH status: seen | acted */
    recommendation: (recommendationId: string) =>
      `/api/centers/recommendations/${seg(recommendationId)}`,
  },
  /**
   * Tutor-facing center console (`/center/api/*`). Separate JWT realm from
   * student Astra `/api/tutor/*`.
   */
  centerApi: {
    auth: {
      login: "/center/api/auth/login",
      logout: "/center/api/auth/logout",
      session: "/center/api/auth/session",
      forgotPassword: "/center/api/auth/forgot-password",
      resetPassword: "/center/api/auth/reset-password",
    },
    centers: {
      list: "/center/api/centers",
      create: "/center/api/centers",
      detail: (centerId: string) => `/center/api/centers/${seg(centerId)}`,
      update: (centerId: string) => `/center/api/centers/${seg(centerId)}`,
    },
    roster: {
      list: (centerId: string) => `/center/api/centers/${seg(centerId)}/roster`,
      remove: (centerId: string, membershipId: string) =>
        `/center/api/centers/${seg(centerId)}/roster/${seg(membershipId)}`,
    },
    groups: {
      list: (centerId: string) => `/center/api/centers/${seg(centerId)}/groups`,
      create: (centerId: string) => `/center/api/centers/${seg(centerId)}/groups`,
      detail: (centerId: string, groupId: string) =>
        `/center/api/centers/${seg(centerId)}/groups/${seg(groupId)}`,
      addMember: (centerId: string, groupId: string) =>
        `/center/api/centers/${seg(centerId)}/groups/${seg(groupId)}/members`,
      removeMember: (centerId: string, groupId: string, membershipId: string) =>
        `/center/api/centers/${seg(centerId)}/groups/${seg(groupId)}/members/${seg(membershipId)}`,
    },
    invites: {
      list: (centerId: string) => `/center/api/centers/${seg(centerId)}/invites`,
      create: (centerId: string) => `/center/api/centers/${seg(centerId)}/invites`,
      revoke: (centerId: string, inviteId: string) =>
        `/center/api/centers/${seg(centerId)}/invites/${seg(inviteId)}/revoke`,
      regenerate: (centerId: string, inviteId: string) =>
        `/center/api/centers/${seg(centerId)}/invites/${seg(inviteId)}/regenerate`,
    },
    assignments: {
      list: (centerId: string) =>
        `/center/api/centers/${seg(centerId)}/assignments`,
      create: (centerId: string) =>
        `/center/api/centers/${seg(centerId)}/assignments`,
      detail: (centerId: string, assignmentId: string) =>
        `/center/api/centers/${seg(centerId)}/assignments/${seg(assignmentId)}`,
      generate: (centerId: string, assignmentId: string) =>
        `/center/api/centers/${seg(centerId)}/assignments/${seg(assignmentId)}/generate`,
      publish: (centerId: string, assignmentId: string) =>
        `/center/api/centers/${seg(centerId)}/assignments/${seg(assignmentId)}/publish`,
      close: (centerId: string, assignmentId: string) =>
        `/center/api/centers/${seg(centerId)}/assignments/${seg(assignmentId)}/close`,
      extend: (centerId: string, assignmentId: string) =>
        `/center/api/centers/${seg(centerId)}/assignments/${seg(assignmentId)}/extend`,
      duplicate: (centerId: string, assignmentId: string) =>
        `/center/api/centers/${seg(centerId)}/assignments/${seg(assignmentId)}/duplicate`,
      /** P-1 overview. */
      overview: (centerId: string, assignmentId: string) =>
        `/center/api/centers/${seg(centerId)}/assignments/${seg(assignmentId)}/overview`,
      /** P-2 per-student rows. */
      students: (centerId: string, assignmentId: string) =>
        `/center/api/centers/${seg(centerId)}/assignments/${seg(assignmentId)}/students`,
      /** P-3 item analysis. */
      items: (centerId: string, assignmentId: string) =>
        `/center/api/centers/${seg(centerId)}/assignments/${seg(assignmentId)}/items`,
    },
    students: {
      /** P-4 scoped student detail (assignment-scoped only). */
      results: (centerId: string, studentId: string) =>
        `/center/api/centers/${seg(centerId)}/students/${seg(studentId)}/results`,
    },
    recommendations: {
      list: (centerId: string) =>
        `/center/api/centers/${seg(centerId)}/recommendations`,
      create: (centerId: string) =>
        `/center/api/centers/${seg(centerId)}/recommendations`,
      detail: (centerId: string, recommendationId: string) =>
        `/center/api/centers/${seg(centerId)}/recommendations/${seg(recommendationId)}`,
    },
    billing: {
      status: (centerId: string) =>
        `/center/api/centers/${seg(centerId)}/billing`,
      checkout: (centerId: string) =>
        `/center/api/centers/${seg(centerId)}/billing/checkout`,
      verify: (centerId: string) =>
        `/center/api/centers/${seg(centerId)}/billing/verify`,
    },
    /**
     * Tutor Astra (M6) — center-scoped chat. Separate from student
     * `/api/tutor/*` and admin `/admin/api/astra/*`.
     */
    astra: {
      threads: (centerId: string) =>
        `/center/api/centers/${seg(centerId)}/astra/threads`,
      thread: (centerId: string, threadId: string) =>
        `/center/api/centers/${seg(centerId)}/astra/threads/${seg(threadId)}`,
      messagesStream: (centerId: string, threadId: string) =>
        `/center/api/centers/${seg(centerId)}/astra/threads/${seg(threadId)}/messages/stream`,
      messagesStop: (centerId: string, threadId: string) =>
        `/center/api/centers/${seg(centerId)}/astra/threads/${seg(threadId)}/messages/stream/stop`,
      runStream: (centerId: string, threadId: string, runId: string) =>
        `/center/api/centers/${seg(centerId)}/astra/threads/${seg(threadId)}/runs/${seg(runId)}/stream`,
      actionsResume: (centerId: string, threadId: string) =>
        `/center/api/centers/${seg(centerId)}/astra/threads/${seg(threadId)}/actions/resume`,
    },
    /** Per-center AI token pool (M6). Owner tops up; staff draw from pool. */
    tokens: {
      balance: (centerId: string) =>
        `/center/api/centers/${seg(centerId)}/tokens`,
      packs: (centerId: string) =>
        `/center/api/centers/${seg(centerId)}/tokens/packs`,
      checkout: (centerId: string) =>
        `/center/api/centers/${seg(centerId)}/tokens/checkout`,
      verify: (centerId: string) =>
        `/center/api/centers/${seg(centerId)}/tokens/verify`,
    },
    /**
     * Owner referral wallet (M7). Balance is per tutor owner; spend targets a
     * center token pool. Owner-only (T-9).
     */
    wallet: {
      status: "/center/api/wallet",
      spendTokens: (centerId: string) =>
        `/center/api/centers/${seg(centerId)}/wallet/spend-tokens`,
      withdraw: "/center/api/wallet/withdraw",
    },
    /** Team plan facilitators (M5). Owner manages; staff can list. */
    facilitators: {
      list: (centerId: string) =>
        `/center/api/centers/${seg(centerId)}/facilitators`,
      invite: (centerId: string) =>
        `/center/api/centers/${seg(centerId)}/facilitators/invites`,
      revokeMember: (centerId: string, membershipId: string) =>
        `/center/api/centers/${seg(centerId)}/facilitators/${seg(membershipId)}/revoke`,
      revokeInvite: (centerId: string, inviteId: string) =>
        `/center/api/centers/${seg(centerId)}/facilitators/invites/${seg(inviteId)}/revoke`,
    },
    facilitatorInvites: {
      preview: (code: string) =>
        `/center/api/facilitator-invites/${seg(code)}`,
      accept: (code: string) =>
        `/center/api/facilitator-invites/${seg(code)}/accept`,
    },
    archive: (centerId: string) =>
      `/center/api/centers/${seg(centerId)}/archive`,
  },
  admin: {
    auth: {
      login: "/admin/api/auth/login",
      logout: "/admin/api/auth/logout",
      session: "/admin/api/auth/session",
      forgotPassword: "/admin/api/auth/forgot-password",
      resetPassword: "/admin/api/auth/reset-password",
    },
    overview: "/admin/api/overview",
    analytics: "/admin/api/analytics",
    calibration: "/admin/api/calibration",
    audit: "/admin/api/audit",
    auditActors: "/admin/api/audit/actors",
    admins: "/admin/api/admins",
    adminStatus: (adminId: string) => `/admin/api/admins/${seg(adminId)}/status`,
    students: {
      list: "/admin/api/students",
      detail: (userId: string) => `/admin/api/students/${seg(userId)}`,
      status: (userId: string) => `/admin/api/students/${seg(userId)}/status`,
      tier: (userId: string) => `/admin/api/students/${seg(userId)}/tier`,
      forceSignout: (userId: string) => `/admin/api/students/${seg(userId)}/force-signout`,
      deletionImpact: (userId: string) => `/admin/api/students/${seg(userId)}/deletion-impact`,
    },
    questions: {
      list: "/admin/api/questions",
      detail: (questionId: string) => `/admin/api/questions/${seg(questionId)}`,
      usage: (questionId: string) => `/admin/api/questions/${seg(questionId)}/usage`,
      import: "/admin/api/questions/import",
      formOptions: "/admin/api/questions/form-options",
      coverage: "/admin/api/questions/coverage",
      export: "/admin/api/questions/export",
    },
    coverageQuestions: {
      list: "/admin/api/coverage-questions",
      coverage: "/admin/api/coverage-questions/coverage",
      import: "/admin/api/coverage-questions/import",
    },
    materials: {
      list: "/admin/api/materials",
      detail: (materialId: string) => `/admin/api/materials/${seg(materialId)}`,
      sign: "/admin/api/materials/sign",
      subjects: "/admin/api/materials/subjects",
    },
    subjects: {
      list: "/admin/api/subjects",
      detail: (subjectId: string) => `/admin/api/subjects/${seg(subjectId)}`,
    },
    curriculums: {
      list: "/admin/api/curriculums",
      detail: (curriculumId: string) => `/admin/api/curriculums/${seg(curriculumId)}`,
      topics: (curriculumId: string) => `/admin/api/curriculums/${seg(curriculumId)}/topics`,
    },
    topics: {
      detail: (topicId: string) => `/admin/api/topics/${seg(topicId)}`,
    },
    academicTerms: {
      list: "/admin/api/academic-terms",
      detail: (termId: string) => `/admin/api/academic-terms/${seg(termId)}`,
    },
    lessons: {
      topic: (topicId: string) => `/admin/api/lessons/${seg(topicId)}`,
      import: "/admin/api/lessons/import",
      tree: "/admin/api/lesson-tree",
      browse: "/admin/api/lesson-browse",
    },
    astra: {
      threads: "/admin/api/astra/threads",
      thread: (threadId: string) => `/admin/api/astra/threads/${seg(threadId)}`,
      messagesStream: (threadId: string) =>
        `/admin/api/astra/threads/${seg(threadId)}/messages/stream`,
      messagesStop: (threadId: string) =>
        `/admin/api/astra/threads/${seg(threadId)}/messages/stream/stop`,
      runStream: (threadId: string, runId: string) =>
        `/admin/api/astra/threads/${seg(threadId)}/runs/${seg(runId)}/stream`,
      actionsResume: (threadId: string) =>
        `/admin/api/astra/threads/${seg(threadId)}/actions/resume`,
    },
    announcements: {
      list: "/admin/api/announcements",
      preview: "/admin/api/announcements/preview",
      test: "/admin/api/announcements/test",
      cancel: (id: string) => `/admin/api/announcements/${seg(id)}/cancel`,
    },
    billing: {
      plans: "/admin/api/billing/plans",
      seed: "/admin/api/billing/plans/seed",
      features: "/admin/api/billing/features",
      plan: (code: string) => `/admin/api/billing/plans/${seg(code)}`,
      entitlement: (code: string, featureCode: string) =>
        `/admin/api/billing/plans/${seg(code)}/entitlements/${seg(featureCode)}`,
    },
    /** Tutor Centers admin (M4): tutors list/verify/suspend, reports, access audit. */
    centers: {
      tutors: "/admin/api/centers/tutors",
      tutor: (userId: string) => `/admin/api/centers/tutors/${seg(userId)}`,
      tutorStatus: (userId: string) =>
        `/admin/api/centers/tutors/${seg(userId)}/status`,
      tutorVerify: (userId: string) =>
        `/admin/api/centers/tutors/${seg(userId)}/verify`,
      reports: "/admin/api/centers/reports",
      report: (reportId: string) =>
        `/admin/api/centers/reports/${seg(reportId)}`,
      accessAudit: "/admin/api/centers/audit",
      /** M7: withdraw request ops queue (D11). */
      withdrawals: "/admin/api/centers/withdrawals",
      /** Body: `{ fulfil: boolean, note? }` — reject when fulfil=false. */
      withdrawalFulfil: (withdrawalId: string) =>
        `/admin/api/centers/withdrawals/${seg(withdrawalId)}/fulfil`,
    },
  },
} as const;
