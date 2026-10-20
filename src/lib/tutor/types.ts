export type TutorContext =
  | { type: "lesson"; lessonId: string }
  | { type: "question"; questionId: string; attemptId?: string }
  | { type: "topic"; subjectSlug: string; topicSlug: string }
  | { type: "general" };

export const TUTOR_ACTIONS = [
  "explain_simply",
  "example",
  "test_me",
  "hint_next",
  "reveal",
  "explain_differently",
] as const;
export type TutorAction = (typeof TUTOR_ACTIONS)[number];

export const TUTOR_MAX_CHARS = 500;

export type TutorRole = "student" | "astra";

export type TutorMessage = {
  id: string;
  role: TutorRole;
  text: string;
  rating?: "up" | "down" | null;
  suggested?: TutorAction[];
};

export type TutorStatus = {
  allowed: boolean;
  tier: string;
  remainingToday: number;
  resetsAt: string | null;
  reason?: string;
};

export type TutorThread = { threadId: string; messages: TutorMessage[] };

export type TutorErrorInfo = {
  code: string;
  message: string;
  resetsAt?: string;
};

export type TutorStreamEvent =
  | { type: "start"; messageId: string; remainingToday: number }
  | { type: "delta"; text: string }
  | { type: "suggest"; actions: TutorAction[] }
  | { type: "done"; messageId: string }
  | ({ type: "error" } & TutorErrorInfo);

export type TutorSendRequest = {
  text: string;
  action: TutorAction | null;
  clientMessageId: string;
};
