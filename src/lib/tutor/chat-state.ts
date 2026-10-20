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
  remainingToday: number | null;
  hintsUsed: number;
  lastRequest: TutorSendRequest | null;
};

export type ChatAction =
  | { type: "send"; request: TutorSendRequest }
  | { type: "event"; event: TutorStreamEvent }
  | { type: "failed"; error: TutorErrorInfo }
  | { type: "stopped" }
  | { type: "rate"; messageId: string; rating: "up" | "down" };

export function initialChatState(messages: TutorMessage[]): ChatState {
  return {
    messages,
    phase: "idle",
    error: null,
    remainingToday: null,
    hintsUsed: 0,
    lastRequest: null,
  };
}

const pendingId = (clientMessageId: string) => `pending-${clientMessageId}`;

/** Drops a trailing Astra message that never received any text. */
function dropEmptyReply(messages: TutorMessage[]): TutorMessage[] {
  const last = messages[messages.length - 1];
  return last && last.role === "astra" && last.text === ""
    ? messages.slice(0, -1)
    : messages;
}

function mapLastReply(
  messages: TutorMessage[],
  fn: (m: TutorMessage) => TutorMessage,
): TutorMessage[] {
  const i = messages.length - 1;
  if (i < 0 || messages[i].role !== "astra") return messages;
  return [...messages.slice(0, i), fn(messages[i]), ...messages.slice(i + 1)];
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "send": {
      const { request } = action;
      // A retry reuses its clientMessageId (the BE de-duplicates quota on it),
      // so its bubble is already on screen and must not be added twice.
      const isRetry = state.messages.some((m) => m.id === request.clientMessageId);
      const base = dropEmptyReply(state.messages);
      const messages: TutorMessage[] = [
        ...(isRetry
          ? base
          : [
              ...base,
              {
                id: request.clientMessageId,
                role: "student" as const,
                text: request.text,
              },
            ]),
        { id: pendingId(request.clientMessageId), role: "astra", text: "" },
      ];
      return {
        ...state,
        messages,
        phase: "streaming",
        error: null,
        lastRequest: request,
        hintsUsed:
          request.action === "hint_next" && !isRetry
            ? state.hintsUsed + 1
            : state.hintsUsed,
      };
    }
    case "event": {
      const { event } = action;
      switch (event.type) {
        case "start":
          return {
            ...state,
            remainingToday: event.remainingToday,
            messages: mapLastReply(state.messages, (m) => ({
              ...m,
              id: event.messageId,
            })),
          };
        case "delta":
          return {
            ...state,
            messages: mapLastReply(state.messages, (m) => ({
              ...m,
              text: m.text + event.text,
            })),
          };
        case "suggest":
          return {
            ...state,
            messages: mapLastReply(state.messages, (m) => ({
              ...m,
              suggested: event.actions,
            })),
          };
        case "done":
          return { ...state, phase: "idle" };
        case "error":
          return chatReducer(state, {
            type: "failed",
            error: {
              code: event.code,
              message: event.message,
              resetsAt: event.resetsAt,
            },
          });
      }
      return state;
    }
    case "failed":
      return {
        ...state,
        phase: "error",
        error: action.error,
        messages: dropEmptyReply(state.messages),
      };
    case "stopped":
      return { ...state, phase: "idle", messages: dropEmptyReply(state.messages) };
    case "rate":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, rating: action.rating } : m,
        ),
      };
  }
}
