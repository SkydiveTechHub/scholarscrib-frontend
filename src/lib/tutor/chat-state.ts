import { mapApiMessage } from "./map";
import type {
  TutorErrorInfo,
  TutorMessage,
  TutorSendRequest,
  TutorStreamEvent,
} from "./types";

export type ChatPhase = "idle" | "streaming" | "error";

export type ChatState = {
  messages: TutorMessage[];
  phase: ChatPhase;
  error: TutorErrorInfo | null;
  statusLine: string | null;
  hintsUsed: number;
  lastRequest: TutorSendRequest | null;
  pendingUserId: string | null;
  /** Soft-lock composer after 429 until this epoch ms (from Retry-After). */
  rateLimitedUntil: number | null;
};

export type ChatAction =
  | { type: "send"; request: TutorSendRequest; pendingUserId: string }
  | { type: "event"; event: TutorStreamEvent }
  | { type: "failed"; error: TutorErrorInfo }
  | { type: "stopped" }
  | { type: "reconcile"; messages: TutorMessage[] }
  | { type: "rate"; messageId: string; rating: "up" | "down" };

export const DRAFT_ID = "draft-assistant";

export function initialChatState(messages: TutorMessage[]): ChatState {
  return {
    messages,
    phase: "idle",
    error: null,
    statusLine: null,
    hintsUsed: 0,
    lastRequest: null,
    pendingUserId: null,
    rateLimitedUntil: null,
  };
}

function dropDraft(messages: TutorMessage[]): TutorMessage[] {
  return messages.filter((m) => m.id !== DRAFT_ID);
}

function dropEmptyDraft(messages: TutorMessage[]): TutorMessage[] {
  const last = messages[messages.length - 1];
  if (last?.id === DRAFT_ID && last.text === "") {
    return messages.slice(0, -1);
  }
  return messages;
}

function ensureDraft(messages: TutorMessage[]): TutorMessage[] {
  const last = messages[messages.length - 1];
  if (last?.id === DRAFT_ID) return messages;
  return [
    ...dropDraft(messages),
    { id: DRAFT_ID, role: "astra", text: "", groundedOn: [] },
  ];
}

function appendToken(messages: TutorMessage[], text: string): TutorMessage[] {
  const withDraft = ensureDraft(messages);
  const i = withDraft.length - 1;
  const last = withDraft[i];
  return [
    ...withDraft.slice(0, i),
    { ...last, text: last.text + text },
  ];
}

/** Final assistant text always comes from assistantMessage, never token concat. */
function applyAssistant(
  messages: TutorMessage[],
  assistant: TutorMessage,
): TutorMessage[] {
  const without = dropDraft(messages);
  return [...without, assistant];
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "send": {
      const { request, pendingUserId } = action;
      return {
        ...state,
        messages: [
          ...dropEmptyDraft(state.messages),
          { id: pendingUserId, role: "student", text: request.text },
        ],
        phase: "streaming",
        error: null,
        statusLine: "Understanding your question…",
        lastRequest: request,
        pendingUserId,
        hintsUsed:
          request.action === "hint_next"
            ? state.hintsUsed + 1
            : state.hintsUsed,
      };
    }
    case "event": {
      const { event } = action;
      switch (event.type) {
        case "userMessage": {
          const mapped = mapApiMessage(event.message);
          const pending = state.pendingUserId;
          return {
            ...state,
            pendingUserId: null,
            messages: pending
              ? state.messages.map((m) => (m.id === pending ? mapped : m))
              : [...dropEmptyDraft(state.messages), mapped],
          };
        }
        case "status":
          return {
            ...state,
            statusLine: statusLineFor(event.status.node),
          };
        case "token":
          return {
            ...state,
            messages: appendToken(state.messages, event.text),
          };
        case "assistantMessage":
          return {
            ...state,
            statusLine: null,
            messages: applyAssistant(
              state.messages,
              mapApiMessage(event.message),
            ),
          };
        case "done":
          return {
            ...state,
            phase: "idle",
            statusLine: null,
            messages: dropEmptyDraft(state.messages),
          };
        case "error":
          return chatReducer(state, {
            type: "failed",
            error: {
              code: event.code,
              message: event.message,
              resetsAt: event.resetsAt,
              retryAfterSec: event.retryAfterSec,
            },
          });
      }
      return state;
    }
    case "failed": {
      const until =
        action.error.code === "RATE_LIMITED" && action.error.retryAfterSec
          ? Date.now() + action.error.retryAfterSec * 1000
          : action.error.code === "RATE_LIMITED"
            ? Date.now() + 60_000
            : state.rateLimitedUntil;
      return {
        ...state,
        phase: "error",
        error: action.error,
        statusLine: null,
        pendingUserId: null,
        messages: dropEmptyDraft(state.messages),
        rateLimitedUntil: until,
      };
    }
    case "stopped":
      return {
        ...state,
        phase: "idle",
        statusLine: null,
        pendingUserId: null,
        messages: dropEmptyDraft(state.messages),
      };
    case "reconcile":
      return {
        ...state,
        phase: "idle",
        statusLine: null,
        error: null,
        pendingUserId: null,
        messages: action.messages,
      };
    case "rate":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, rating: action.rating } : m,
        ),
      };
  }
}

function statusLineFor(node: string): string {
  switch (node) {
    case "classify_intent":
      return "Understanding your question…";
    case "grade_documents":
      return "Checking lesson notes…";
    case "ground_answer":
      return "Verifying the answer…";
    case "remember":
      return "Saving what helps you…";
    default:
      return "Thinking…";
  }
}
