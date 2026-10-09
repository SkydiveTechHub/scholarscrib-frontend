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
  },
  user: {
    profile: "/api/user/profile",
    completeProfile: "/api/user/complete-profile",
    password: "/api/user/password",
    notificationPreferences: "/api/user/notification-preferences",
    avatar: "/api/user/avatar",
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
    coverageSubjects: "/api/questions/coverage/subjects",
    coverageSubjectYears: (subject: string) =>
      `/api/questions/coverage/subjects/${seg(subject)}/years`,
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
  studyPlan: {
    root: "/api/study-plan",
    positions: "/api/study-plan/positions",
    item: (itemId: string) => `/api/study-plan/items/${seg(itemId)}`,
  },
  lessons: {
    progress: (lessonId: string) => `/api/lessons/${seg(lessonId)}/progress`,
  },
  learningPath: {
    pretest: (topicId: string) => `/api/learning-path/topics/${seg(topicId)}/pretest`,
  },
  library: "/api/library",
  achievements: "/api/achievements",
  announcements: {
    list: "/api/announcements",
    dismiss: (id: string) => `/api/announcements/${seg(id)}/dismiss`,
  },
  dashboard: "/api/dashboard",
  performance: "/api/performance",
  classroom: {
    subjects: "/api/classroom/subjects",
    subject: (slug: string) => `/api/classroom/subjects/${seg(slug)}`,
    curriculum: (slug: string) => `/api/subjects/${seg(slug)}/curriculum`,
    topic: (slug: string, topicSlug: string, suffix = "") =>
      `/api/classroom/subjects/${seg(slug)}/topics/${seg(topicSlug)}${suffix}`,
  },
  billing: {
    checkout: "/api/billing/checkout",
  },
  push: {
    subscription: "/api/push/subscription",
  },
  admin: {
    auth: {
      login: "/admin/api/auth/login",
      logout: "/admin/api/auth/logout",
      session: "/admin/api/auth/session",
    },
    overview: "/admin/api/overview",
    analytics: "/admin/api/analytics",
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
    announcements: {
      list: "/admin/api/announcements",
      preview: "/admin/api/announcements/preview",
      test: "/admin/api/announcements/test",
      cancel: (id: string) => `/admin/api/announcements/${seg(id)}/cancel`,
    },
  },
} as const;
