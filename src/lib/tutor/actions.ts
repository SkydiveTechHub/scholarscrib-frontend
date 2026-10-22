import type {
  ActionProposal,
  ActionProposalGrounding,
  GroundedOn,
  ProposalField,
  TutorGrounding,
} from "./types";

const TOOL_TITLES: Record<string, string> = {
  create_study_plan: "Create study plan",
  update_study_plan: "Update study plan",
  delete_study_plan: "Delete study plan",
  set_study_plan_positions: "Update class positions",
  set_study_plan_item_status: "Update a plan item",
};

export function actionTitle(tool: string): string {
  return TOOL_TITLES[tool] ?? "Study plan change";
}

/** Study-plan tools use their title. Everything else uses the server's line. */
export function toolCardTitle(name: string, summary: string): string {
  return TOOL_TITLES[name] ?? (summary.trim() || "Working");
}

export function actionConfirmLabel(proposal: ActionProposal): string {
  return proposal.tool === "delete_study_plan" ? "Delete plan" : "Approve";
}

export function actionIsDanger(proposal: ActionProposal): boolean {
  return proposal.destructive || proposal.tool === "delete_study_plan";
}

/** True for a grounding row whose action already finished. `kind` has been removed. */
export function isSettledAction(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const status = (raw as { status?: unknown }).status;
  return status === "executed" || status === "rejected";
}

function parseFields(raw: unknown): ProposalField[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const fields: ProposalField[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const field = item as Record<string, unknown>;
    if (typeof field.key !== "string" || field.key === "") continue;
    if (typeof field.label !== "string" || field.label === "") continue;
    if (field.type !== "string" && field.type !== "number") continue;
    fields.push({
      key: field.key,
      label: field.label,
      type: field.type,
      ...(field.required === true ? { required: true } : {}),
      ...(typeof field.maxLength === "number" && field.maxLength > 0
        ? { maxLength: field.maxLength }
        : {}),
    });
  }
  return fields.length > 0 ? fields : undefined;
}

/**
 * Accepts the live `actionProposal` event or a pending `groundedOn` entry.
 * A status other than `pending` is not a card.
 */
export function toActionProposal(raw: unknown): ActionProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, unknown>;
  if (g.kind != null && g.kind !== "actionProposal") return null;
  if (g.status != null && g.status !== "pending") return null;
  if (
    typeof g.actionId !== "string" ||
    g.actionId === "" ||
    typeof g.checkpointId !== "string" ||
    g.checkpointId === "" ||
    typeof g.tool !== "string" ||
    g.tool === "" ||
    typeof g.summary !== "string"
  ) {
    return null;
  }
  const fields = parseFields(g.fields);
  return {
    actionId: g.actionId,
    checkpointId: g.checkpointId,
    tool: g.tool,
    args: "args" in g ? (g.args ?? null) : null,
    summary: g.summary,
    destructive: g.destructive === true,
    status: "pending",
    ...(fields ? { fields } : {}),
  };
}

export function canEditProposal(proposal: ActionProposal): boolean {
  return !actionIsDanger(proposal) && (proposal.fields?.length ?? 0) > 0;
}

export function fieldValues(proposal: ActionProposal): Record<string, string> {
  const args =
    proposal.args && typeof proposal.args === "object"
      ? (proposal.args as Record<string, unknown>)
      : {};
  const values: Record<string, string> = {};
  for (const field of proposal.fields ?? []) {
    const value = args[field.key];
    values[field.key] = value == null ? "" : String(value);
  }
  return values;
}

export type ProposalEditResult =
  | { ok: true; args: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> };

/** Local check before resume. The server still validates the payload. */
export function proposalEdits(
  proposal: ActionProposal,
  values: Record<string, string>,
): ProposalEditResult {
  const args: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const field of proposal.fields ?? []) {
    const raw = values[field.key] ?? "";
    if (field.type === "number") {
      const trimmed = raw.trim();
      if (trimmed === "") {
        if (field.required) errors[field.key] = "Enter a number";
        continue;
      }
      if (field.maxLength != null && trimmed.length > field.maxLength) {
        errors[field.key] = `Use at most ${field.maxLength} characters`;
        continue;
      }
      const value = Number(trimmed);
      if (!Number.isFinite(value)) errors[field.key] = "Enter a number";
      else args[field.key] = value;
      continue;
    }
    if (field.required && raw.trim() === "") {
      errors[field.key] = "This is required";
      continue;
    }
    if (field.maxLength != null && raw.length > field.maxLength) {
      errors[field.key] = `Use at most ${field.maxLength} characters`;
      continue;
    }
    args[field.key] = raw;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, args };
}

export function isActionProposalGrounding(
  item: TutorGrounding,
): item is ActionProposalGrounding {
  return (
    "kind" in item &&
    item.kind === "actionProposal" &&
    item.status === "pending"
  );
}

export function proposalFromGrounding(
  items: readonly TutorGrounding[] | undefined,
): ActionProposal | undefined {
  const hit = items?.find(isActionProposalGrounding);
  if (!hit) return undefined;
  return {
    actionId: hit.actionId,
    checkpointId: hit.checkpointId,
    tool: hit.tool,
    args: hit.args ?? null,
    summary: hit.summary,
    destructive: hit.destructive,
    status: "pending",
    ...(hit.fields?.length ? { fields: hit.fields } : {}),
  };
}

export function citationsOnly(
  items: readonly TutorGrounding[] | undefined,
): GroundedOn[] {
  return (items ?? []).filter((item): item is GroundedOn => {
    if (isSettledAction(item)) return false;
    if ("kind" in item && item.kind === "actionProposal") return false;
    return true;
  });
}
