import type {
  TutorApiMessage,
  TutorApiThread,
  TutorMessage,
  TutorRole,
  TutorThread,
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
