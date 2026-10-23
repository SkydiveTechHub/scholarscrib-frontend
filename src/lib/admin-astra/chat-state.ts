import { statusLabel } from "./labels";
import type {
  AstraError,
  AstraMessage,
  AstraProposal,
  AstraStep,
  AstraStreamEvent,
  AstraTool,
} from "./types";

export type AstraPhase = "idle" | "streaming" | "error";

export type AstraState = {
  messages: AstraMessage[];
  phase: AstraPhase;
  error: AstraError | null;
  /** Inline on the pending card. The card stays up. */
  cardError: string | null;
  pendingAction: AstraProposal | null;
  resuming: boolean;
  steps: AstraStep[];
  lastEventId: string | null;
  reconnecting: boolean;
  accumulateId: string | null;
  /** Snapshot from actionExecuted, attached to the outcome row. */
  lastResult: unknown;
  /** How the open card was settled, so a reject is not labeled applied. */
  settleStatus: "executed" | "rejected" | null;
  pendingUserId: string | null;
};

export type AstraAction =
  | { type: "send"; text: string; pendingUserId: string }
  | { type: "resume" }
  | { type: "reconnecting" }
  | { type: "event"; event: AstraStreamEvent }
  | { type: "failed"; error: AstraError }
  | { type: "stopped" }
  | { type: "reconcile"; messages: AstraMessage[] };

export const DRAFT_ID = "draft-assistant";

export function initialAstraState(messages: AstraMessage[]): AstraState {
  return {
    messages,
    phase: "idle",
    error: null,
    cardError: null,
    pendingAction: pendingFrom(messages),
    resuming: false,
    steps: [],
    lastEventId: null,
    reconnecting: false,
    accumulateId: null,
    lastResult: undefined,
    settleStatus: null,
    pendingUserId: null,
  };
}

function pendingFrom(messages: readonly AstraMessage[]): AstraProposal | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const proposal = messages[i].proposal;
    if (proposal) return proposal;
  }
  return null;
}

function dropDraft(messages: AstraMessage[]): AstraMessage[] {
  return messages.filter((message) => message.id !== DRAFT_ID);
}

function hasBody(message: AstraMessage): boolean {
  return message.text !== "" || message.proposal != null || (message.tools?.length ?? 0) > 0;
}

function dropEmptyDraft(messages: AstraMessage[]): AstraMessage[] {
  const last = messages[messages.length - 1];
  if (last?.id === DRAFT_ID && !hasBody(last)) return messages.slice(0, -1);
  return messages;
}

/** Latest stored assistant reply. False when the admin spoke last. */
export function turnLanded(messages: readonly AstraMessage[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.id === DRAFT_ID) continue;
    if (message.role !== "assistant") return false;
    return hasBody(message);
  }
  return false;
}

/** True when the server has an assistant message this client has not applied. */
export function storedReplyIsNew(
  local: readonly AstraMessage[],
  remote: readonly AstraMessage[],
): boolean {
  const known = new Set(local.map((message) => message.id));
  return remote.some((message) => message.role === "assistant" && !known.has(message.id));
}

function ensureDraft(messages: AstraMessage[]): AstraMessage[] {
  const last = messages[messages.length - 1];
  if (last?.id === DRAFT_ID) return messages;
  return [...dropDraft(messages), { id: DRAFT_ID, role: "assistant", text: "" }];
}

function targetIndex(state: AstraState): { messages: AstraMessage[]; index: number } {
  if (state.accumulateId) {
    const index = state.messages.findIndex((message) => message.id === state.accumulateId);
    if (index !== -1) return { messages: state.messages, index };
  }
  const messages = ensureDraft(state.messages);
  return { messages, index: messages.length - 1 };
}

function appendToken(state: AstraState, text: string): AstraMessage[] {
  const { messages, index } = targetIndex(state);
  const last = messages[index];
  return [
    ...messages.slice(0, index),
    { ...last, text: last.text + text },
    ...messages.slice(index + 1),
  ];
}

function upsertTool(items: AstraTool[] | undefined, tool: AstraTool): AstraTool[] {
  const list = items ?? [];
  const at = list.findIndex((entry) => entry.id === tool.id);
  if (at === -1) return [...list, tool];
  return list.map((entry, index) => (index === at ? tool : entry));
}

function withTool(state: AstraState, tool: AstraTool): AstraState {
  const { messages, index } = targetIndex(state);
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
      { ...last, tools: upsertTool(last.tools, tool) },
      ...messages.slice(index + 1),
    ],
  };
}

function mergeCarried(assistant: AstraMessage, carried: AstraMessage | undefined): AstraMessage {
  const tools = assistant.tools?.length ? assistant.tools : carried?.tools;
  const proposal = assistant.proposal ?? carried?.proposal;
  return {
    ...assistant,
    ...(tools?.length ? { tools } : {}),
    ...(proposal ? { proposal } : {}),
  };
}

function applyAssistant(state: AstraState, assistant: AstraMessage): AstraMessage[] {
  const messages = state.messages;
  if (state.accumulateId) {
    const index = messages.findIndex((message) => message.id === state.accumulateId);
    if (index !== -1) {
      const merged = mergeCarried(assistant, messages[index]);
      return messages
        .map((message, i) => (i === index ? merged : message))
        .filter((message) => message.id !== DRAFT_ID);
    }
  }
  const existing = messages.find((message) => message.id === assistant.id);
  if (existing) {
    const merged = mergeCarried(assistant, existing);
    return dropDraft(messages).map((message) =>
      message.id === assistant.id ? merged : message,
    );
  }
  const draft = messages.find((message) => message.id === DRAFT_ID);
  return [...dropDraft(messages), mergeCarried(assistant, draft)];
}

function attachProposal(messages: AstraMessage[], proposal: AstraProposal | null): AstraMessage[] {
  if (!proposal) return messages;
  const draft = messages.findIndex((message) => message.id === DRAFT_ID);
  let index = draft;
  if (index === -1) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        index = i;
        break;
      }
    }
  }
  if (index === -1) {
    return [...messages, { id: DRAFT_ID, role: "assistant", text: proposal.summary, proposal }];
  }
  return messages.map((message, i) =>
    i === index
      ? { ...message, proposal, text: message.text || proposal.summary }
      : message,
  );
}

function settleCards(
  messages: AstraMessage[],
  status: "executed" | "rejected",
): AstraMessage[] {
  return messages.map((message) => {
    if (!message.proposal) return message;
    return {
      ...message,
      proposal: null,
      settled: {
        summary: message.proposal.summary,
        status,
        tool: message.proposal.tool,
      },
    };
  });
}

function replaceById(messages: AstraMessage[], next: AstraMessage): AstraMessage[] {
  if (!messages.some((message) => message.id === next.id)) return [...dropDraft(messages), next];
  return dropDraft(messages).map((message) => (message.id === next.id ? { ...message, ...next } : message));
}

function pushStep(steps: AstraStep[], node: string, label: string): AstraStep[] {
  const existing = steps.findIndex((step) => step.node === node);
  const done = (step: AstraStep): AstraStep =>
    step.phase === "active" ? { ...step, phase: "done" } : step;
  if (existing !== -1) {
    return steps.map((step, index) =>
      index === existing ? { ...step, label, phase: "active" } : done(step),
    );
  }
  return [...steps.map(done), { id: node, node, label, phase: "active" }];
}

function idleFlags(state: AstraState): AstraState {
  return {
    ...state,
    phase: "idle",
    resuming: false,
    reconnecting: false,
    steps: [],
    accumulateId: null,
  };
}

export function astraReducer(incoming: AstraState, action: AstraAction): AstraState {
  const state =
    action.type === "event" && action.event.eventId
      ? { ...incoming, lastEventId: action.event.eventId }
      : incoming;
  switch (action.type) {
    case "send": {
      if (state.pendingAction || state.resuming || state.phase === "streaming") return state;
      return {
        ...state,
        messages: [
          ...dropEmptyDraft(state.messages),
          { id: action.pendingUserId, role: "user", text: action.text },
        ],
        phase: "streaming",
        error: null,
        cardError: null,
        steps: [],
        lastEventId: null,
        reconnecting: false,
        accumulateId: null,
        lastResult: undefined,
        settleStatus: null,
        pendingUserId: action.pendingUserId,
      };
    }
    case "resume":
      return {
        ...state,
        phase: "streaming",
        error: null,
        cardError: null,
        steps: [],
        lastEventId: null,
        reconnecting: false,
        accumulateId: null,
        resuming: true,
        lastResult: undefined,
        settleStatus: null,
      };
    case "reconnecting": {
      const last = [...state.messages].reverse().find((message) => message.id !== DRAFT_ID);
      const accumulateId = last?.role === "assistant" ? last.id : null;
      return {
        ...state,
        reconnecting: true,
        error: null,
        phase: "streaming",
        accumulateId,
      };
    }
    case "event":
      return applyEvent(state, action.event);
    case "failed": {
      if (action.error.code === "INVALID" && state.pendingAction) {
        return {
          ...idleFlags(state),
          cardError: action.error.message,
          error: null,
        };
      }
      if (action.error.code === "CONFLICT" && state.pendingAction) {
        const messages = state.pendingUserId
          ? state.messages.filter((message) => message.id !== state.pendingUserId)
          : state.messages;
        return {
          ...idleFlags(state),
          phase: "error",
          error: { code: "CONFLICT", message: "Approve or dismiss the change first." },
          pendingUserId: null,
          messages: dropEmptyDraft(messages),
        };
      }
      return {
        ...idleFlags(state),
        phase: "error",
        resuming: false,
        error: action.error,
        pendingUserId: null,
        messages: dropEmptyDraft(state.messages),
      };
    }
    case "stopped": {
      const last = state.messages[state.messages.length - 1];
      const partial: AstraMessage | null =
        last?.id === DRAFT_ID && hasBody(last)
          ? { ...last, id: `stopped-${last.text.length}-${state.messages.length}` }
          : null;
      return {
        ...idleFlags(state),
        pendingUserId: null,
        messages: [...dropDraft(state.messages), ...(partial ? [partial] : [])],
      };
    }
    case "reconcile":
      return {
        ...initialAstraState(action.messages),
        lastEventId: null,
      };
  }
}

function applyEvent(state: AstraState, event: AstraStreamEvent): AstraState {
  switch (event.type) {
    case "userMessage": {
      const pending = state.pendingUserId;
      if (pending && !state.messages.some((message) => message.id === event.message.id)) {
        return {
          ...state,
          pendingUserId: null,
          messages: state.messages.map((message) =>
            message.id === pending ? event.message : message,
          ),
        };
      }
      if (state.messages.some((message) => message.id === event.message.id)) return state;
      return {
        ...state,
        pendingUserId: null,
        messages: [...dropEmptyDraft(state.messages), event.message],
      };
    }
    case "status": {
      const label = statusLabel(event.node);
      return { ...state, steps: pushStep(state.steps, event.node, label) };
    }
    case "token":
      return { ...state, messages: appendToken(state, event.text) };
    case "tool":
      return withTool(state, event.tool);
    case "assistantMessage": {
      if (state.resuming) {
        const outcome: AstraMessage = {
          ...event.message,
          proposal: null,
          ...(state.lastResult !== undefined ? { result: state.lastResult } : {}),
        };
        return {
          ...state,
          pendingAction: null,
          accumulateId: null,
          lastResult: undefined,
          messages: applyAssistant(
            { ...state, accumulateId: null, messages: settleCards(state.messages, "executed") },
            outcome,
          ),
        };
      }
      const proposal = event.message.proposal ?? state.pendingAction;
      return {
        ...state,
        pendingAction: proposal,
        accumulateId: null,
        messages: applyAssistant(
          state,
          proposal ? { ...event.message, proposal } : event.message,
        ),
      };
    }
    case "actionProposal":
      return {
        ...state,
        pendingAction: event.proposal,
        messages: attachProposal(state.messages, event.proposal),
      };
    case "proposalSettled":
      return {
        ...state,
        pendingAction: null,
        messages: replaceById(state.messages, {
          ...event.message,
          proposal: null,
          settled: event.message.settled ?? {
            summary: event.message.text,
            status: state.settleStatus ?? "executed",
            tool: "",
          },
        }),
      };
    case "actionExecuted":
      return {
        ...state,
        pendingAction: null,
        lastResult: event.result,
        settleStatus: "executed",
        messages: settleCards(state.messages, "executed"),
      };
    case "actionRejected":
      return {
        ...state,
        pendingAction: null,
        lastResult: undefined,
        settleStatus: "rejected",
        messages: settleCards(state.messages, "rejected"),
      };
    case "done": {
      if (event.cancelled) return astraReducer(state, { type: "stopped" });
      const settled = idleFlags(state);
      if (event.paused) {
        const proposal = event.pendingAction ?? state.pendingAction;
        return {
          ...settled,
          pendingAction: proposal,
          messages: attachProposal(dropEmptyDraft(state.messages), proposal),
        };
      }
      return { ...settled, messages: dropEmptyDraft(state.messages) };
    }
    case "error":
      return astraReducer(state, {
        type: "failed",
        error: { code: event.code, message: event.message },
      });
    default:
      return state;
  }
}
