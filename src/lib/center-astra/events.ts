import { z } from "zod";
import { mapMessage } from "./map";
import { parseProposal } from "./proposals";
import type { AstraStreamEvent, AstraTool } from "./types";
import type { SseFrame } from "@/lib/tutor/sse";

const message = z
  .object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })
  .passthrough();

const MALFORMED: AstraStreamEvent = {
  type: "error",
  code: "UNAVAILABLE",
  message: "Astra's reply got scrambled. Please try again.",
};

const KNOWN = new Set([
  "streamStarted",
  "userMessage",
  "status",
  "token",
  "tool",
  "ui",
  "assistantMessage",
  "actionProposal",
  "actionExecuted",
  "actionRejected",
  "proposalSettled",
  "done",
]);

function json(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
}

function tool(raw: unknown): AstraTool | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.name !== "string") return null;
  if (row.phase !== "running" && row.phase !== "done" && row.phase !== "failed") return null;
  return {
    id: row.id,
    name: row.name,
    phase: row.phase,
    summary: typeof row.summary === "string" ? row.summary : "",
  };
}

function decodeKnown(event: string, data: string): AstraStreamEvent | null {
  const payload = json(data);
  if (payload === undefined) return MALFORMED;
  switch (event) {
    case "streamStarted": {
      const parsed = z
        .object({
          threadId: z.string(),
          runId: z.string().optional(),
          streamId: z.string().optional(),
          threadTitle: z.string().nullable().optional(),
        })
        .passthrough()
        .safeParse(payload);
      if (!parsed.success) return MALFORMED;
      const runId = parsed.data.runId ?? parsed.data.streamId;
      if (!runId) return MALFORMED;
      return {
        type: "streamStarted",
        threadId: parsed.data.threadId,
        runId,
        threadTitle: parsed.data.threadTitle ?? null,
      };
    }
    case "userMessage":
    case "assistantMessage":
    case "proposalSettled": {
      if (!message.safeParse(payload).success) return MALFORMED;
      const mapped = mapMessage(payload);
      if (!mapped) return MALFORMED;
      if (event === "userMessage") return { type: "userMessage", message: mapped };
      if (event === "proposalSettled") return { type: "proposalSettled", message: mapped };
      return { type: "assistantMessage", message: mapped };
    }
    case "status": {
      const parsed = z.object({ node: z.string() }).passthrough().safeParse(payload);
      if (!parsed.success) return MALFORMED;
      return { type: "status", node: parsed.data.node };
    }
    case "token": {
      const parsed = z.object({ text: z.string().optional() }).safeParse(payload);
      if (!parsed.success) return MALFORMED;
      return { type: "token", text: parsed.data.text ?? "" };
    }
    case "tool": {
      const parsed = tool(payload);
      return parsed ? { type: "tool", tool: parsed } : null;
    }
    case "ui":
      return null;
    case "actionProposal": {
      const proposal = parseProposal(payload);
      return proposal ? { type: "actionProposal", proposal } : MALFORMED;
    }
    case "actionExecuted":
    case "actionRejected": {
      const row = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
      const actionId = typeof row.actionId === "string" ? row.actionId : undefined;
      if (event === "actionRejected") return { type: "actionRejected", actionId };
      const result = "result" in row ? row.result : undefined;
      return { type: "actionExecuted", actionId, ...(result !== undefined ? { result } : {}) };
    }
    case "done": {
      const row = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
      if (!row) return MALFORMED;
      const pending = row.pendingAction ? parseProposal(row.pendingAction) : null;
      return {
        type: "done",
        paused: row.paused === true,
        cancelled: row.cancelled === true,
        ...(pending ? { pendingAction: pending } : {}),
      };
    }
    default:
      return null;
  }
}

/** Unknown names and this surface's empty `ui` frames are dropped. */
export function decodeFrame(frame: SseFrame): AstraStreamEvent | null {
  if (!KNOWN.has(frame.event)) return null;
  const event = decodeKnown(frame.event, frame.data);
  if (!event) return null;
  return frame.id ? { ...event, eventId: frame.id } : event;
}
