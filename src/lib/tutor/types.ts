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

/** One editable input on a study-plan proposal. Keys outside this list stay put. */
export type ProposalField = {
  key: string;
  label: string;
  type: "string" | "number";
  required?: boolean;
  maxLength?: number;
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
  /** Present when the student may change the payload before approving. */
  fields?: ProposalField[];
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

export type TutorToolPhase = "running" | "done" | "failed";

/** A graph tool the student can see. `summary` is the only line we show. */
export type TutorToolCall = {
  id: string;
  name: string;
  phase: TutorToolPhase;
  summary: string;
};

export type WorkedExampleProps = {
  problem: string;
  steps: string[];
};

export type PracticeQuestionProps = {
  prompt: string;
  choices?: string[];
};

/** Fixed study cards. Anything else in the stream is dropped. */
export type TutorUiBlock =
  | { id: string; component: "worked_example"; props: WorkedExampleProps }
  | { id: string; component: "practice_question"; props: PracticeQuestionProps };

export type TutorStepPhase = "active" | "done" | "failed";

export type TutorStep = {
  id: string;
  node: string;
  label: string;
  phase: TutorStepPhase;
};

/** A graph run that is still going after the socket drops. */
export type ActiveRun = {
  runId: string;
  status: "running" | "paused";
};

/** Wire shape from the tutor API. */
export type TutorApiMessage = {
  id: string;
  role: TutorApiRole;
  content: string;
  groundedOn: TutorGrounding[];
  createdAt: string | null;
  tools?: TutorToolCall[];
  blocks?: TutorUiBlock[];
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
  /** Null when the last turn is already stored on the messages. */
  activeRun?: ActiveRun | null;
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
  tools?: TutorToolCall[];
  blocks?: TutorUiBlock[];
};

export type TutorThread = {
  threadId: string;
  messages: TutorMessage[];
  /** Wrong-answer seed shown as a banner, not a chat bubble. */
  systemBanner?: string | null;
  activeRun?: ActiveRun | null;
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
  /** The socket closed before `done`. The hook may rejoin instead of showing this. */
  dropped?: boolean;
};

export type TutorStreamEvent = (
  | {
      type: "streamStarted";
      threadId: string;
      threadTitle: string | null;
    }
  | { type: "userMessage"; message: TutorApiMessage }
  | { type: "status"; status: TutorStatusEvent }
  | { type: "token"; text: string }
  | { type: "tool"; tool: TutorToolCall }
  | { type: "ui"; block: TutorUiBlock }
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
  | ({ type: "error" } & TutorErrorInfo)
) & {
  /** SSE `id`, when the server sent one. Used to rejoin after that frame. */
  eventId?: string;
};

export type TutorSendRequest = {
  text: string;
  action: TutorAction | null;
};
