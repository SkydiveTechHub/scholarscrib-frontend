import { mapApiMessage } from "./map";
import type {
  ActionProposal,
  TutorErrorInfo,
  TutorMessage,
  TutorSendRequest,
  TutorStep,
  TutorStreamEvent,
  TutorToolCall,
  TutorUiBlock,
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
  /** Graph nodes for the turn that is still streaming. */
  steps: TutorStep[];
  /** Last SSE id applied. A rejoin asks for frames after this. */
  lastEventId: string | null;
  /** True while a dropped turn is being fetched or resubscribed. */
  reconnecting: boolean;
  /**
   * When set, tokens and cards land on this Astra message instead of a new
   * draft. Used when a rejoin continues a reply the thread GET already stored.
   */
  accumulateId: string | null;
};

export type ChatAction =
  | { type: "send"; request: TutorSendRequest; pendingUserId: string }
  | { type: "resume" }
  | { type: "reconnecting" }
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
    steps: [],
    lastEventId: null,
    reconnecting: false,
    accumulateId: null,
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

function hasBody(message: TutorMessage): boolean {
  return (
    message.text !== "" ||
    message.actionProposal != null ||
    (message.tools?.length ?? 0) > 0 ||
    (message.blocks?.length ?? 0) > 0
  );
}

function dropEmptyDraft(messages: TutorMessage[]): TutorMessage[] {
  const last = messages[messages.length - 1];
  if (last?.id === DRAFT_ID && !hasBody(last)) return messages.slice(0, -1);
  return messages;
}

/** The latest stored Astra reply, skipping a local draft. False when the student spoke last. */
export function turnLanded(messages: readonly TutorMessage[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.id === DRAFT_ID) continue;
    if (message.role !== "astra") return false;
    return hasBody(message);
  }
  return false;
}

/** True when the server has an Astra message this client has not applied yet. */
export function storedReplyIsNew(
  local: readonly TutorMessage[],
  remote: readonly TutorMessage[],
): boolean {
  const known = new Set(local.map((message) => message.id));
  return remote.some(
    (message) =>
      message.role === "astra" &&
      message.id !== DRAFT_ID &&
      !known.has(message.id) &&
      hasBody(message),
  );
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

/** The paused row is updated in place; the follow-up reply is a separate message. */
function replaceSettled(
  messages: TutorMessage[],
  settled: TutorMessage,
): TutorMessage[] {
  const next = { ...settled, actionProposal: undefined };
  const index = messages.findIndex((m) => m.id === settled.id);
  if (index !== -1) {
    const previous = messages[index];
    return messages.map((m, i) =>
      i === index
        ? { ...next, rating: previous.rating, stopped: previous.stopped }
        : m,
    );
  }
  let pendingAt = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].actionProposal) {
      pendingAt = i;
      break;
    }
  }
  if (pendingAt === -1) return messages;
  return messages.map((m, i) => (i === pendingAt ? next : m));
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

function targetMessages(state: ChatState): {
  messages: TutorMessage[];
  index: number;
} {
  if (state.accumulateId) {
    const index = state.messages.findIndex((m) => m.id === state.accumulateId);
    if (index !== -1) return { messages: state.messages, index };
  }
  const messages = ensureDraft(state.messages);
  return { messages, index: messages.length - 1 };
}

function appendToken(state: ChatState, text: string): TutorMessage[] {
  const { messages, index } = targetMessages(state);
  const last = messages[index];
  return [
    ...messages.slice(0, index),
    { ...last, text: last.text + text },
    ...messages.slice(index + 1),
  ];
}

function upsertById<T extends { id: string }>(items: T[] | undefined, item: T): T[] {
  const list = items ?? [];
  const at = list.findIndex((entry) => entry.id === item.id);
  if (at === -1) return [...list, item];
  return list.map((entry, index) => (index === at ? item : entry));
}

function withTool(state: ChatState, tool: TutorToolCall): ChatState {
  const { messages, index } = targetMessages(state);
  const last = messages[index];
  const steps =
    tool.phase === "failed"
      ? state.steps.map((step) =>
          step.node === tool.name && step.phase === "active"
            ? { ...step, phase: "failed" as const }
            : step,
        )
      : state.steps;
  return {
    ...state,
    steps,
    messages: [
      ...messages.slice(0, index),
      { ...last, tools: upsertById(last.tools, tool) },
      ...messages.slice(index + 1),
    ],
  };
}

function withBlock(state: ChatState, block: TutorUiBlock): ChatState {
  const { messages, index } = targetMessages(state);
  const last = messages[index];
  return {
    ...state,
    messages: [
      ...messages.slice(0, index),
      { ...last, blocks: upsertById(last.blocks, block) },
      ...messages.slice(index + 1),
    ],
  };
}

function mergeCarried(
  assistant: TutorMessage,
  carried: TutorMessage | undefined,
): TutorMessage {
  const tools = assistant.tools?.length ? assistant.tools : carried?.tools;
  const blocks = assistant.blocks?.length ? assistant.blocks : carried?.blocks;
  return {
    ...assistant,
    ...(tools?.length ? { tools } : {}),
    ...(blocks?.length ? { blocks } : {}),
  };
}

/** Final assistant text always comes from assistantMessage, never token concat. */
function applyAssistant(state: ChatState, assistant: TutorMessage): TutorMessage[] {
  const messages = state.messages;
  if (state.accumulateId) {
    const index = messages.findIndex((m) => m.id === state.accumulateId);
    if (index !== -1) {
      const previous = messages[index];
      const merged = mergeCarried(assistant, previous);
      return messages
        .map((m, i) =>
          i === index
            ? { ...merged, rating: previous.rating, stopped: previous.stopped }
            : m,
        )
        .filter((m) => m.id !== DRAFT_ID);
    }
  }
  const existing = messages.find((m) => m.id === assistant.id);
  if (existing) {
    const merged = mergeCarried(assistant, existing);
    return dropDraft(messages).map((m) =>
      m.id === assistant.id
        ? { ...merged, rating: existing.rating, stopped: existing.stopped }
        : m,
    );
  }
  const draft = messages.find((m) => m.id === DRAFT_ID);
  return [...dropDraft(messages), mergeCarried(assistant, draft)];
}

function pushStep(steps: TutorStep[], node: string, label: string): TutorStep[] {
  const existing = steps.findIndex((step) => step.node === node);
  const done = (step: TutorStep): TutorStep =>
    step.phase === "active" ? { ...step, phase: "done" } : step;
  if (existing !== -1) {
    return steps.map((step, index) => {
      if (index === existing) return { ...step, label, phase: "active" };
      return done(step);
    });
  }
  return [
    ...steps.map(done),
    { id: node, node, label, phase: "active" },
  ];
}

export function chatReducer(incoming: ChatState, action: ChatAction): ChatState {
  const state =
    action.type === "event" && action.event.eventId
      ? { ...incoming, lastEventId: action.event.eventId }
      : incoming;
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
        steps: [],
        lastEventId: null,
        reconnecting: false,
        accumulateId: null,
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
        steps: [],
        lastEventId: null,
        reconnecting: false,
        accumulateId: null,
        resuming: true,
      };
    case "reconnecting": {
      const last = state.messages[state.messages.length - 1];
      const accumulateId =
        last?.role === "astra" && last.id !== DRAFT_ID ? last.id : null;
      return {
        ...state,
        reconnecting: true,
        error: null,
        phase: "streaming",
        accumulateId,
      };
    }
    case "event": {
      const { event } = action;
      switch (event.type) {
        case "userMessage": {
          const mapped = mapApiMessage(event.message);
          const pending = state.pendingUserId;
          if (pending) {
            return {
              ...state,
              pendingUserId: null,
              messages: state.messages.map((m) => (m.id === pending ? mapped : m)),
            };
          }
          if (state.messages.some((m) => m.id === mapped.id)) return state;
          return {
            ...state,
            pendingUserId: null,
            messages: [...dropEmptyDraft(state.messages), mapped],
          };
        }
        case "status": {
          const label = statusLineFor(event.status.node);
          return {
            ...state,
            statusLine: label,
            steps: pushStep(state.steps, event.status.node, label),
          };
        }
        case "token":
          return {
            ...state,
            messages: appendToken(state, event.text),
          };
        case "tool":
          return withTool(state, event.tool);
        case "ui":
          return withBlock(state, event.block);
        case "assistantMessage": {
          const mapped = mapApiMessage(event.message);
          if (state.resuming) {
            const cleared = clearProposals(state.messages);
            return {
              ...state,
              statusLine: null,
              pendingAction: null,
              accumulateId: null,
              messages: applyAssistant(
                { ...state, accumulateId: null, messages: cleared },
                { ...mapped, actionProposal: undefined },
              ),
            };
          }
          const proposal = mapped.actionProposal ?? state.pendingAction;
          return {
            ...state,
            statusLine: null,
            pendingAction: proposal,
            accumulateId: null,
            messages: applyAssistant(
              state,
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
        case "proposalSettled":
          return {
            ...state,
            pendingAction: null,
            statusLine: null,
            messages: replaceSettled(
              state.messages,
              mapApiMessage(event.message),
            ),
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
          const settled = {
            phase: "idle" as const,
            statusLine: null,
            resuming: false,
            reconnecting: false,
            steps: [],
            accumulateId: null,
          };
          if (event.paused) {
            const proposal = event.pendingAction ?? state.pendingAction;
            return {
              ...state,
              ...settled,
              pendingAction: proposal,
              messages: attachProposal(dropEmptyDraft(state.messages), proposal),
            };
          }
          return {
            ...state,
            ...settled,
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
          steps: [],
          reconnecting: false,
          accumulateId: null,
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
          steps: [],
          reconnecting: false,
          accumulateId: null,
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
        steps: [],
        reconnecting: false,
        accumulateId: null,
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
        last?.id === DRAFT_ID && hasBody(last)
          ? { ...last, id: `stopped-${crypto.randomUUID()}`, stopped: true }
          : null;
      const kept = dropDraft(state.messages);
      const lastStudent = kept.map((m) => m.role).lastIndexOf("student");
      return {
        ...state,
        phase: "idle",
        statusLine: null,
        steps: [],
        reconnecting: false,
        accumulateId: null,
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
        steps: [],
        lastEventId: null,
        reconnecting: false,
        accumulateId: null,
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
