/**
 * Query keys for every cached read. Invalidate through these so a mutation
 * and the queries it stales always agree on the key, e.g.
 * `queryClient.invalidateQueries({ queryKey: queryKeys.user.all })`.
 * Each domain's `all` is a prefix of its narrower keys, so invalidating it
 * refreshes the whole domain.
 */
export const queryKeys = {
  session: {
    all: ["session"] as const,
  },
  user: {
    all: ["user"] as const,
    profile: () => [...queryKeys.user.all, "profile"] as const,
    devices: () => [...queryKeys.user.all, "devices"] as const,
  },
  subjects: {
    all: ["subjects"] as const,
  },
  questions: {
    all: ["questions"] as const,
    pastPapers: () => [...queryKeys.questions.all, "past-papers"] as const,
  },
  assessments: {
    all: ["assessments"] as const,
    mockExamBoards: () => [...queryKeys.assessments.all, "mock-exam", "boards"] as const,
    mockExamOptions: (examType: string) =>
      [...queryKeys.assessments.all, "mock-exam", "options", examType] as const,
  },
  flashcards: {
    all: ["flashcards"] as const,
    preview: (lessonId: string) => [...queryKeys.flashcards.all, "preview", lessonId] as const,
  },
  studyPlan: {
    all: ["study-plan"] as const,
  },
  library: {
    all: ["library"] as const,
    subject: (subjectId: string) => [...queryKeys.library.all, subjectId] as const,
  },
  announcements: {
    all: ["announcements"] as const,
  },
  admin: {
    all: ["admin"] as const,
    questions: (params?: Record<string, unknown>) =>
      [...queryKeys.admin.all, "questions", params ?? {}] as const,
    questionUsage: (questionId: string) =>
      [...queryKeys.admin.all, "questions", "usage", questionId] as const,
    lessonTopic: (topicId: string) => [...queryKeys.admin.all, "lessons", topicId] as const,
    materials: () => [...queryKeys.admin.all, "materials"] as const,
    students: () => [...queryKeys.admin.all, "students"] as const,
    admins: () => [...queryKeys.admin.all, "admins"] as const,
    academicTerms: () => [...queryKeys.admin.all, "academic-terms"] as const,
    announcements: () => [...queryKeys.admin.all, "announcements"] as const,
  },
} as const;
