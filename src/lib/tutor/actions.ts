import type {
  ActionProposal,
  ActionProposalGrounding,
  GroundedOn,
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

export function actionConfirmLabel(proposal: ActionProposal): string {
  return proposal.tool === "delete_study_plan" ? "Delete plan" : "Approve";
}

export function actionIsDanger(proposal: ActionProposal): boolean {
  return proposal.destructive || proposal.tool === "delete_study_plan";
}

/** Accepts the SSE payload or a `groundedOn` entry. Missing `kind` is allowed. */
export function toActionProposal(raw: unknown): ActionProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, unknown>;
  if (g.kind != null && g.kind !== "actionProposal") return null;
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
  return {
    actionId: g.actionId,
    checkpointId: g.checkpointId,
    tool: g.tool,
    args: "args" in g ? (g.args ?? null) : null,
    summary: g.summary,
    destructive: g.destructive === true,
  };
}

export function isActionProposalGrounding(
  item: TutorGrounding,
): item is ActionProposalGrounding {
  return "kind" in item && item.kind === "actionProposal";
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
  };
}

export function citationsOnly(
  items: readonly TutorGrounding[] | undefined,
): GroundedOn[] {
  return (items ?? []).filter(
    (item): item is GroundedOn => !isActionProposalGrounding(item),
  );
}
