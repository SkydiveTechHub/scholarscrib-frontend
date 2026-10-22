import type {
  TutorApiMessage,
  TutorApiThread,
  TutorMessage,
  TutorRole,
  TutorThread,
  TutorThreadSummary,
} from "./types";

function uiRole(role: TutorApiMessage["role"]): TutorRole {
  if (role === "user") return "student";
  if (role === "assistant") return "astra";
  return "system";
}

export function mapApiMessage(m: TutorApiMessage): TutorMessage {
  return {
    id: m.id,
    role: uiRole(m.role),
    text: m.content,
    groundedOn: m.groundedOn ?? [],
  };
}

/** Banner text from a wrong-answer system seed, if present. */
export function systemBannerFrom(messages: TutorApiMessage[]): string | null {
  const system = messages.find((m) => m.role === "system");
  if (!system?.content) return null;
  return system.content;
}

/**
 * History rows for the list. Threads that were created but never used (no
 * title, never updated) are left out so "New chat" doesn't litter the list.
 */
export function mapApiThreadSummaries(
  threads: TutorApiThread[],
): TutorThreadSummary[] {
  return threads
    .filter((t) => !t.archived && (t.title || t.updatedAt !== t.createdAt))
    .map((t) => ({
      threadId: t.id,
      title: t.title?.trim() || "Untitled chat",
      scope: t.lessonId
        ? "lesson"
        : t.questionId
          ? "question"
          : t.topicId
            ? "topic"
            : "general",
      updatedAt: t.updatedAt,
    }));
}

export function mapApiThread(thread: TutorApiThread): TutorThread {
  const raw = thread.messages ?? [];
  return {
    threadId: thread.id,
    messages: raw
      .filter((m) => m.role !== "system")
      .map(mapApiMessage),
    systemBanner: systemBannerFrom(raw),
  };
}
