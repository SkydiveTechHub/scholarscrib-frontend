const STATUS_LABELS: Record<string, string> = {
  classify_intent: "Reading the request…",
  pick_domain: "Choosing the area…",
  action_agent: "Drafting…",
  action_tools: "Looking that up…",
  inspect_action_tools: "Preparing the draft…",
  await_action_approval: "Waiting for approval…",
  execute_action: "Applying the change…",
  action_outcome: "Finishing…",
};

/** Stage line for one graph node. Unknown nodes stay generic. */
export function statusLabel(node: string): string {
  return STATUS_LABELS[node] ?? "Thinking…";
}

/** Titles for BE tools in `app/ai/center_astra/tools`. */
const TOOL_TITLES: Record<string, string> = {
  list_assignments: "Listing assignments",
  assignment_overview: "Reading assignment results",
  assignment_student_rows: "Listing student results",
  assignment_item_analysis: "Checking question difficulty",
  student_scoped_detail: "Opening scoped student results",
  list_roster: "Listing the roster",
  list_groups: "Listing groups",
  get_student_mastery: "Checking scoped topic evidence",
  draft_assignment: "Drafting an assignment",
  publish_assignment: "Publishing an assignment",
  draft_recommendation: "Drafting a recommendation",
};

/** Prefer a known tool title; fall back to the server summary. */
export function toolTitle(name: string, summary: string): string {
  return TOOL_TITLES[name] ?? (summary.trim() || "Working on that…");
}
