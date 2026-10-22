import { z } from "zod";
import { toActionProposal } from "./actions";
import type {
  GroundedOn,
  TutorApiMessage,
  TutorGrounding,
  TutorStreamEvent,
} from "./types";

const citation = z
  .object({
    sourceType: z.enum(["lesson", "question", "material"]).optional(),
    docId: z.string().optional(),
    subjectId: z.string().optional(),
    topicId: z.string().optional(),
    lessonId: z.string().optional(),
    questionId: z.string().optional(),
    resourceId: z.string().optional(),
    title: z.string().optional(),
    excerpt: z.string().optional(),
  })
  .passthrough();

const apiMessage = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  groundedOn: z.array(z.unknown()).default([]),
  createdAt: z.string().nullable().optional(),
});

const statusPayload = z
  .object({
    node: z.string(),
    route: z.string().optional(),
    confidence: z.number().optional(),
    noul: z.number().optional(),
    source: z.string().optional(),
  })
  .passthrough();

const tokenPayload = z.object({ text: z.string().optional() });
const donePayload = z
  .object({
    ok: z.boolean().optional(),
    paused: z.boolean().optional(),
    pendingAction: z.unknown().optional(),
  })
  .passthrough();

const MALFORMED: TutorStreamEvent = {
  type: "error",
  code: "UNAVAILABLE",
  message: "Astra's reply got scrambled. Please try again.",
};

const startedPayload = z
  .object({
    threadId: z.string(),
    threadTitle: z.string().nullable().optional(),
  })
  .passthrough();

const KNOWN = [
  "streamStarted",
  "userMessage",
  "status",
  "token",
  "assistantMessage",
  "actionProposal",
  "actionExecuted",
  "actionRejected",
  "done",
] as const;

function parseGrounding(raw: unknown): TutorGrounding | null {
  if (
    raw &&
    typeof raw === "object" &&
    (raw as { kind?: unknown }).kind === "actionProposal"
  ) {
    const proposal = toActionProposal(raw);
    return proposal ? { kind: "actionProposal", ...proposal } : null;
  }
  const parsed = citation.safeParse(raw);
  if (!parsed.success) return null;
  const citationFields: GroundedOn = {
    sourceType: parsed.data.sourceType,
    docId: parsed.data.docId,
    subjectId: parsed.data.subjectId,
    topicId: parsed.data.topicId,
    lessonId: parsed.data.lessonId,
    questionId: parsed.data.questionId,
    resourceId: parsed.data.resourceId,
    title: parsed.data.title,
    excerpt: parsed.data.excerpt,
  };
  return citationFields;
}

function toApiMessage(
  parsed: z.infer<typeof apiMessage>,
): TutorApiMessage | null {
  const groundedOn: TutorGrounding[] = [];
  for (const item of parsed.groundedOn ?? []) {
    const grounding = parseGrounding(item);
    if (!grounding) return null;
    groundedOn.push(grounding);
  }
  return {
    id: parsed.id,
    role: parsed.role,
    content: parsed.content,
    groundedOn,
    createdAt: parsed.createdAt ?? null,
  };
}

function actionIdOf(json: unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined;
  const id = (json as { actionId?: unknown }).actionId;
  return typeof id === "string" ? id : undefined;
}

/** Null for event names this client does not know, so the server can add events without breaking old clients. */
export function decodeFrame(frame: {
  event: string;
  data: string;
}): TutorStreamEvent | null {
  if (!(KNOWN as readonly string[]).includes(frame.event)) return null;

  let json: unknown;
  try {
    json = JSON.parse(frame.data);
  } catch {
    return MALFORMED;
  }

  switch (frame.event) {
    case "streamStarted": {
      const r = startedPayload.safeParse(json);
      return r.success
        ? {
            type: "streamStarted",
            threadId: r.data.threadId,
            threadTitle: r.data.threadTitle ?? null,
          }
        : MALFORMED;
    }
    case "userMessage": {
      const r = apiMessage.safeParse(json);
      if (!r.success) return MALFORMED;
      const message = toApiMessage(r.data);
      return message ? { type: "userMessage", message } : MALFORMED;
    }
    case "status": {
      const r = statusPayload.safeParse(json);
      return r.success
        ? {
            type: "status",
            status: {
              node: r.data.node,
              route: r.data.route,
              confidence: r.data.confidence,
              noul: r.data.noul,
              source: r.data.source,
            },
          }
        : MALFORMED;
    }
    case "token": {
      const r = tokenPayload.safeParse(json);
      return r.success
        ? { type: "token", text: r.data.text ?? "" }
        : MALFORMED;
    }
    case "assistantMessage": {
      const r = apiMessage.safeParse(json);
      if (!r.success) return MALFORMED;
      const message = toApiMessage(r.data);
      return message ? { type: "assistantMessage", message } : MALFORMED;
    }
    case "actionProposal": {
      const proposal = toActionProposal(json);
      return proposal ? { type: "actionProposal", proposal } : MALFORMED;
    }
    case "actionExecuted":
    case "actionRejected": {
      const type =
        frame.event === "actionRejected"
          ? "actionRejected"
          : "actionExecuted";
      const actionId = actionIdOf(json);
      return actionId ? { type, actionId } : { type };
    }
    case "done": {
      const r = donePayload.safeParse(json);
      if (!r.success) return MALFORMED;
      if (!r.data.paused) return { type: "done" };
      return {
        type: "done",
        paused: true,
        pendingAction: toActionProposal(r.data.pendingAction),
      };
    }
    default:
      return null;
  }
}
