import { mapApiMessage } from "./map";
import type {
  ActionProposal,
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
  /** Set while a confirmation card is waiting. Another message would 409. */
  pendingAction: ActionProposal | null;
  /** True from resume until that stream finishes. Not a student message. */
  resuming: boolean;
};

export type ChatAction =
  | { type: "send"; request: TutorSendRequest; pendingUserId: string }
  | { type: "resume" }
  | { type: "event"; event: TutorStreamEvent }
  | { type: "failed"; error: TutorErrorInfo }
  | { type: "stopped" }
  | { type: "edit"; messageId: string }
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
    pendingAction: pendingFrom(messages),
    resuming: false,
  };
}

function pendingFrom(messages: TutorMessage[]): ActionProposal | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const proposal = messages[i].actionProposal;
    if (proposal) return proposal;
  }
  return null;
}

function dropDraft(messages: TutorMessage[]): TutorMessage[] {
  return messages.filter((m) => m.id !== DRAFT_ID);
}

function dropEmptyDraft(messages: TutorMessage[]): TutorMessage[] {
  const last = messages[messages.length - 1];
  if (last?.id === DRAFT_ID && last.text === "" && !last.actionProposal) {
    return messages.slice(0, -1);
  }
  return messages;
}

function attachProposal(
  messages: TutorMessage[],
  proposal: ActionProposal | null,
): TutorMessage[] {
  if (!proposal) return messages;
  let index = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "astra") {
      index = i;
      break;
    }
  }
  const next = index === -1 ? ensureDraft(messages) : messages;
  const at = index === -1 ? next.length - 1 : index;
  return [
    ...next.slice(0, at),
    { ...next[at], actionProposal: proposal },
    ...next.slice(at + 1),
  ];
}

function clearProposals(messages: TutorMessage[]): TutorMessage[] {
  return dropEmptyDraft(
    messages.map((m) =>
      m.actionProposal ? { ...m, actionProposal: undefined } : m,
    ),
  );
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
      if (state.pendingAction || state.resuming) return state;
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
    case "resume":
      return {
        ...state,
        phase: "streaming",
        error: null,
        statusLine: null,
        resuming: true,
      };
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
        case "assistantMessage": {
          const mapped = mapApiMessage(event.message);
          if (state.resuming) {
            return {
              ...state,
              statusLine: null,
              pendingAction: null,
              messages: applyAssistant(clearProposals(state.messages), {
                ...mapped,
                actionProposal: undefined,
              }),
            };
          }
          const proposal = mapped.actionProposal ?? state.pendingAction;
          return {
            ...state,
            statusLine: null,
            pendingAction: proposal,
            messages: applyAssistant(
              state.messages,
              proposal ? { ...mapped, actionProposal: proposal } : mapped,
            ),
          };
        }
        case "actionProposal":
          return {
            ...state,
            pendingAction: event.proposal,
            statusLine: null,
            messages: attachProposal(state.messages, event.proposal),
          };
        case "actionExecuted":
        case "actionRejected":
          return {
            ...state,
            pendingAction: null,
            statusLine: null,
            messages: clearProposals(state.messages),
          };
        case "done": {
          if (event.paused) {
            const proposal = event.pendingAction ?? state.pendingAction;
            return {
              ...state,
              phase: "idle",
              statusLine: null,
              resuming: false,
              pendingAction: proposal,
              messages: attachProposal(dropEmptyDraft(state.messages), proposal),
            };
          }
          return {
            ...state,
            phase: "idle",
            statusLine: null,
            resuming: false,
            messages: dropEmptyDraft(state.messages),
          };
        }
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
      if (state.resuming) {
        const settled = state.pendingAction == null;
        return {
          ...state,
          phase: "error",
          resuming: false,
          error: {
            code: "ACTION_RESUME",
            message: settled
              ? "Astra's reply was cut off. Your choice was already sent."
              : "Couldn't confirm that change. You can try again.",
          },
          statusLine: null,
          pendingUserId: null,
        };
      }
      if (action.error.code === "ACTION_PENDING") {
        const messages = state.pendingUserId
          ? state.messages.filter((m) => m.id !== state.pendingUserId)
          : state.messages;
        return {
          ...state,
          phase: "error",
          error: action.error,
          statusLine: null,
          pendingUserId: null,
          messages: dropEmptyDraft(messages),
        };
      }
      const until =
        action.error.code === "RATE_LIMITED" && action.error.retryAfterSec
          ? Date.now() + action.error.retryAfterSec * 1000
          : action.error.code === "RATE_LIMITED"
            ? Date.now() + 60_000
            : state.rateLimitedUntil;
      return {
        ...state,
        phase: "error",
        resuming: false,
        error: action.error,
        statusLine: null,
        pendingUserId: null,
        messages: dropEmptyDraft(state.messages),
        rateLimitedUntil: until,
      };
    }
    case "stopped": {
      // Keep the turn on screen, like any chat app: the question stays, and
      // whatever Astra had streamed so far stays with a "stopped" marker.
      const last = state.messages[state.messages.length - 1];
      const partial: TutorMessage | null =
        last?.id === DRAFT_ID && last.text !== ""
          ? { ...last, id: `stopped-${crypto.randomUUID()}`, stopped: true }
          : null;
      const kept = dropDraft(state.messages);
      const lastStudent = kept.map((m) => m.role).lastIndexOf("student");
      return {
        ...state,
        phase: "idle",
        statusLine: null,
        resuming: false,
        pendingUserId: null,
        messages: [
          ...kept.map((m, i) =>
            i === lastStudent ? { ...m, stopped: true } : m,
          ),
          ...(partial ? [partial] : []),
        ],
      };
    }
    case "edit": {
      // The server dropped the stopped turn, so drop it locally too; the
      // caller moves its text back into the composer.
      const i = state.messages.findIndex((m) => m.id === action.messageId);
      if (i === -1 || !state.messages[i].stopped) return state;
      return { ...state, messages: state.messages.slice(0, i) };
    }
    case "reconcile":
      return {
        ...state,
        phase: "idle",
        statusLine: null,
        error: null,
        pendingUserId: null,
        resuming: false,
        pendingAction: pendingFrom(action.messages),
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
