export type TutorContext =
  | {
      type: "lesson";
      lessonId: string;
      subjectId?: string;
      topicId?: string;
    }
  | {
      type: "question";
      questionId: string;
      attemptId?: string;
      subjectId?: string;
      topicId?: string;
      wrongAnswerContext?: string;
    }
  | { type: "topic"; subjectSlug: string; topicSlug: string }
  | { type: "general" };

/** Client-only chip helpers — never sent as API `action` codes. */
export const TUTOR_ACTIONS = [
  "explain_simply",
  "example",
  "test_me",
  "hint_next",
  "reveal",
  "explain_differently",
] as const;
export type TutorAction = (typeof TUTOR_ACTIONS)[number];

export const TUTOR_MAX_CHARS = 8000;

export type SourceType = "lesson" | "question" | "material";

export type GroundedOn = {
  sourceType?: SourceType;
  docId?: string;
  subjectId?: string;
  topicId?: string;
  lessonId?: string;
  questionId?: string;
  resourceId?: string;
  title?: string;
  excerpt?: string;
};

export type TutorApiRole = "user" | "assistant" | "system";

/** Wire shape from the tutor API. */
export type TutorApiMessage = {
  id: string;
  role: TutorApiRole;
  content: string;
  groundedOn: GroundedOn[];
  createdAt: string | null;
};

export type TutorApiThread = {
  id: string;
  title: string | null;
  subjectId: string | null;
  topicId: string | null;
  questionId: string | null;
  lessonId: string | null;
  archived: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  messages?: TutorApiMessage[];
  assistantMessage?: TutorApiMessage;
};

export type TutorThreadCreateBody = {
  subjectId?: string;
  topicId?: string;
  questionId?: string;
  lessonId?: string;
  title?: string;
  firstMessage?: string;
  wrongAnswerContext?: string;
};

export type TutorMessageBody = {
  content: string;
};

export type TutorFeedbackBody = {
  rating: "up" | "down";
  comment?: string;
};

export type TutorStatusEvent = {
  node: string;
  route?: "chitchat" | "sql" | "rag" | string;
  confidence?: number;
  noul?: number;
  source?: "heuristic" | "jev" | "jev_low_confidence" | "llm" | "fallback" | string;
};

/** UI bubble roles (mapped from API at the boundary). */
export type TutorRole = "student" | "astra" | "system";

export type TutorMessage = {
  id: string;
  role: TutorRole;
  text: string;
  groundedOn?: GroundedOn[];
  rating?: "up" | "down" | null;
  suggested?: TutorAction[];
};

export type TutorThread = {
  threadId: string;
  messages: TutorMessage[];
  /** Wrong-answer seed shown as a banner, not a chat bubble. */
  systemBanner?: string | null;
};

export type TutorErrorInfo = {
  code: string;
  message: string;
  resetsAt?: string;
  retryAfterSec?: number;
};

export type TutorStreamEvent =
  | { type: "userMessage"; message: TutorApiMessage }
  | { type: "status"; status: TutorStatusEvent }
  | { type: "token"; text: string }
  | { type: "assistantMessage"; message: TutorApiMessage }
  | { type: "done" }
  | ({ type: "error" } & TutorErrorInfo);

export type TutorSendRequest = {
  text: string;
  action: TutorAction | null;
};
