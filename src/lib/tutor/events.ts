import { z } from "zod";
import type { TutorApiMessage, TutorStreamEvent } from "./types";

const groundedOn = z
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
  groundedOn: z.array(groundedOn).default([]),
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
const donePayload = z.object({ ok: z.boolean().optional() }).passthrough();

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
  "done",
] as const;

function toApiMessage(
  parsed: z.infer<typeof apiMessage>,
): TutorApiMessage {
  return {
    id: parsed.id,
    role: parsed.role,
    content: parsed.content,
    groundedOn: parsed.groundedOn ?? [],
    createdAt: parsed.createdAt ?? null,
  };
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
      return r.success
        ? { type: "userMessage", message: toApiMessage(r.data) }
        : MALFORMED;
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
      return r.success
        ? { type: "assistantMessage", message: toApiMessage(r.data) }
        : MALFORMED;
    }
    case "done": {
      const r = donePayload.safeParse(json);
      return r.success ? { type: "done" } : MALFORMED;
    }
    default:
      return null;
  }
}
