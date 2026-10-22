import { citationsOnly, proposalFromGrounding } from "./actions";
import { parseBlockList, parseToolList } from "./blocks";
import type {
  ActiveRun,
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

export function readActiveRun(raw: unknown): ActiveRun | null {
  if (!raw || typeof raw !== "object") return null;
  const run = raw as { runId?: unknown; status?: unknown };
  if (typeof run.runId !== "string" || run.runId === "") return null;
  if (run.status !== "running" && run.status !== "paused") return null;
  return { runId: run.runId, status: run.status };
}

export function mapApiMessage(m: TutorApiMessage): TutorMessage {
  const actionProposal = proposalFromGrounding(m.groundedOn);
  const tools = parseToolList(m.tools);
  const blocks = parseBlockList(m.blocks);
  return {
    id: m.id,
    role: uiRole(m.role),
    text: m.content,
    groundedOn: citationsOnly(m.groundedOn),
    ...(actionProposal ? { actionProposal } : {}),
    ...(tools ? { tools } : {}),
    ...(blocks ? { blocks } : {}),
  };
}

/** Banner text from a wrong-answer system seed, if present. */
export function systemBannerFrom(messages: TutorApiMessage[]): string | null {
  const system = messages.find((m) => m.role === "system");
  if (!system?.content) return null;
  return system.content;
}

/** Title the server gives a thread until the first message names it. */
const PLACEHOLDER_TITLE = "New chat";

function realTitle(title: string | null): string | null {
  const t = title?.trim();
  return t && t !== PLACEHOLDER_TITLE ? t : null;
}

/**
 * History rows for the list. Threads that were created but never used (still
 * on the server's placeholder title) are left out so "New chat" doesn't litter
 * the list.
 */
export function mapApiThreadSummaries(
  threads: TutorApiThread[],
): TutorThreadSummary[] {
  return threads
    .filter((t) => !t.archived && realTitle(t.title))
    .map((t) => ({
      threadId: t.id,
      title: realTitle(t.title) ?? PLACEHOLDER_TITLE,
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
    activeRun: readActiveRun(thread.activeRun),
  };
}
