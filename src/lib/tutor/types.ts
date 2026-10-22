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

/** A study-plan change Astra will not run until the student approves it. */
export type ActionProposal = {
  actionId: string;
  checkpointId: string;
  tool: string;
  args: unknown;
  summary: string;
  destructive: boolean;
  status: "pending";
};

/**
 * Stored on the paused assistant message. A reload redraws the card only
 * while `status` is `pending`. After resume, `kind` is gone and `status`
 * is `executed` or `rejected`.
 */
export type ActionProposalGrounding = ActionProposal & {
  kind: "actionProposal";
};

export type TutorGrounding = GroundedOn | ActionProposalGrounding;

export type TutorApiRole = "user" | "assistant" | "system";

/** Wire shape from the tutor API. */
export type TutorApiMessage = {
  id: string;
  role: TutorApiRole;
  content: string;
  groundedOn: TutorGrounding[];
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
  /** Set while Astra is waiting for approve or dismiss. Not a new chat turn. */
  actionProposal?: ActionProposal;
  rating?: "up" | "down" | null;
  suggested?: TutorAction[];
  /** Set locally when the student stopped this turn mid-reply. */
  stopped?: boolean;
};

export type TutorThread = {
  threadId: string;
  messages: TutorMessage[];
  /** Wrong-answer seed shown as a banner, not a chat bubble. */
  systemBanner?: string | null;
};

/** One row in the chat history list (no messages; those load on resume). */
export type TutorThreadSummary = {
  threadId: string;
  title: string;
  scope: "lesson" | "question" | "topic" | "general";
  updatedAt: string | null;
};

export type TutorErrorInfo = {
  code: string;
  message: string;
  resetsAt?: string;
  retryAfterSec?: number;
};

export type TutorStreamEvent =
  | {
      type: "streamStarted";
      threadId: string;
      threadTitle: string | null;
    }
  | { type: "userMessage"; message: TutorApiMessage }
  | { type: "status"; status: TutorStatusEvent }
  | { type: "token"; text: string }
  | { type: "assistantMessage"; message: TutorApiMessage }
  | { type: "actionProposal"; proposal: ActionProposal }
  | { type: "actionExecuted"; actionId?: string }
  | { type: "actionRejected"; actionId?: string }
  | { type: "proposalSettled"; message: TutorApiMessage }
  | {
      type: "done";
      /** True when the turn is parked on a confirmation card. */
      paused?: boolean;
      pendingAction?: ActionProposal | null;
    }
  | ({ type: "error" } & TutorErrorInfo);

export type TutorSendRequest = {
  text: string;
  action: TutorAction | null;
};
