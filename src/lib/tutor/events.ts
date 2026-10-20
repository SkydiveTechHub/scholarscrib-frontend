import { z } from "zod";
import type { SseFrame } from "./sse";
import { TUTOR_ACTIONS, type TutorStreamEvent } from "./types";

const start = z.object({ messageId: z.string(), remainingToday: z.number() });
const delta = z.object({ text: z.string() });
const suggest = z.object({ actions: z.array(z.enum(TUTOR_ACTIONS)) });
const done = z.object({ messageId: z.string() });
const failure = z.object({
  code: z.string(),
  message: z.string(),
  resetsAt: z.string().optional(),
});

const MALFORMED: TutorStreamEvent = {
  type: "error",
  code: "UNAVAILABLE",
  message: "Astra's reply got scrambled. Please try again.",
};

const KNOWN = ["start", "delta", "suggest", "done", "error"];

/** Null for event names this client does not know, so the server can add events without breaking old clients. */
export function decodeFrame(frame: SseFrame): TutorStreamEvent | null {
  if (!KNOWN.includes(frame.event)) return null;

  let json: unknown;
  try {
    json = JSON.parse(frame.data);
  } catch {
    return MALFORMED;
  }

  switch (frame.event) {
    case "start": {
      const r = start.safeParse(json);
      return r.success ? { type: "start", ...r.data } : MALFORMED;
    }
    case "delta": {
      const r = delta.safeParse(json);
      return r.success ? { type: "delta", text: r.data.text } : MALFORMED;
    }
    case "suggest": {
      const r = suggest.safeParse(json);
      return r.success ? { type: "suggest", actions: r.data.actions } : MALFORMED;
    }
    case "done": {
      const r = done.safeParse(json);
      return r.success ? { type: "done", messageId: r.data.messageId } : MALFORMED;
    }
    default: {
      const r = failure.safeParse(json);
      return r.success ? { type: "error", ...r.data } : MALFORMED;
    }
  }
}
