export const ADMIN_ASTRA_MAX_CHARS = 8000;

export type AstraRole = "user" | "assistant";

export type AstraField = {
  key: string;
  label: string;
  type: "string" | "number" | "boolean";
  required: boolean;
  maxLength?: number;
};

/** A mutation waiting for this admin. Settled rows are not this type. */
export type AstraProposal = {
  actionId: string;
  checkpointId: string | null;
  tool: string;
  args: Record<string, unknown>;
  summary: string;
  destructive: boolean;
  fields?: AstraField[];
};

export type AstraSettled = {
  summary: string;
  status: "executed" | "rejected";
  tool: string;
};

export type AstraTool = {
  id: string;
  name: string;
  phase: "running" | "done" | "failed";
  summary: string;
};

export type AstraStep = {
  id: string;
  node: string;
  label: string;
  phase: "active" | "done" | "failed";
};

export type AstraMessage = {
  id: string;
  role: AstraRole;
  text: string;
  tools?: AstraTool[];
  proposal?: AstraProposal | null;
  settled?: AstraSettled | null;
  /** Compact snapshot from actionExecuted, shown behind a disclosure. */
  result?: unknown;
  stopped?: boolean;
};

export type ActiveRun = {
  runId: string;
  status: "running" | "paused";
} | null;

export type AstraThreadSummary = {
  id: string;
  title: string | null;
  updatedAt: string | null;
  activeRun: ActiveRun;
};

export type AstraThread = AstraThreadSummary & {
  messages: AstraMessage[];
};

export type AstraError = {
  code: string;
  message: string;
};

export type AstraStreamEvent = (
  | { type: "streamStarted"; threadId: string; runId: string; threadTitle: string | null }
  | { type: "userMessage"; message: AstraMessage }
  | { type: "status"; node: string }
  | { type: "token"; text: string }
  | { type: "tool"; tool: AstraTool }
  | { type: "assistantMessage"; message: AstraMessage }
  | { type: "actionProposal"; proposal: AstraProposal }
  | { type: "actionExecuted"; actionId?: string; result?: unknown }
  | { type: "actionRejected"; actionId?: string }
  | { type: "proposalSettled"; message: AstraMessage }
  | { type: "done"; paused?: boolean; cancelled?: boolean; pendingAction?: AstraProposal | null }
  | { type: "error"; code: string; message: string; dropped?: boolean; running?: boolean }
) & { eventId?: string };
