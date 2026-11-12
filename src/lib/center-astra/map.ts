import { parseSettled, pendingProposal } from "./proposals";
import type {
  ActiveRun,
  AstraMessage,
  AstraThread,
  AstraThreadSummary,
  AstraTool,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function readTool(raw: unknown): AstraTool | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || raw.id === "") return null;
  if (typeof raw.name !== "string" || raw.name === "") return null;
  if (raw.phase !== "running" && raw.phase !== "done" && raw.phase !== "failed") return null;
  return {
    id: raw.id,
    name: raw.name,
    phase: raw.phase,
    summary: typeof raw.summary === "string" ? raw.summary : "",
  };
}

export function readActiveRun(raw: unknown): ActiveRun {
  if (!isRecord(raw)) return null;
  if (typeof raw.runId !== "string" || raw.runId === "") return null;
  if (raw.status !== "running" && raw.status !== "paused") return null;
  return { runId: raw.runId, status: raw.status };
}

export function mapMessage(raw: unknown): AstraMessage | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || raw.id === "") return null;
  if (raw.role !== "user" && raw.role !== "assistant") return null;
  if (typeof raw.content !== "string") return null;
  const grounded = Array.isArray(raw.groundedOn) ? raw.groundedOn : [];
  let proposal = null;
  let settled = null;
  for (const item of grounded) {
    proposal = pendingProposal(item) ?? proposal;
    settled = parseSettled(item) ?? settled;
  }
  if (proposal && raw.pendingAction) proposal = pendingProposal(raw.pendingAction) ?? proposal;
  if (!proposal && raw.paused === true) proposal = pendingProposal(raw.pendingAction);
  const tools = Array.isArray(raw.tools)
    ? raw.tools.map(readTool).filter((tool): tool is AstraTool => tool != null)
    : [];
  return {
    id: raw.id,
    role: raw.role,
    text: raw.content,
    ...(tools.length > 0 ? { tools } : {}),
    ...(proposal ? { proposal } : {}),
    ...(settled && !proposal ? { settled } : {}),
  };
}

function readSummary(raw: unknown): AstraThreadSummary | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || raw.id === "") return null;
  return {
    id: raw.id,
    title: typeof raw.title === "string" ? raw.title : null,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
    activeRun: readActiveRun(raw.activeRun),
  };
}

export function mapThread(raw: unknown): AstraThread | null {
  const summary = readSummary(raw);
  if (!summary || !isRecord(raw)) return null;
  const messages = Array.isArray(raw.messages)
    ? raw.messages.map(mapMessage).filter((message): message is AstraMessage => message != null)
    : [];
  return { ...summary, messages };
}

export function mapThreadList(raw: unknown): AstraThreadSummary[] {
  const rows = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.threads)
      ? raw.threads
      : [];
  return rows
    .map(readSummary)
    .filter((thread): thread is AstraThreadSummary => thread != null);
}
