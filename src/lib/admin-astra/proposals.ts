import type { AstraField, AstraProposal, AstraSettled } from "./types";

/** Identity ids stay as stored. Resume only receives edited field keys. */
export const FROZEN_IDS = new Set([
  "userId",
  "questionId",
  "ids",
  "materialId",
  "termId",
  "subjectId",
  "curriculumId",
  "topicId",
  "adminId",
  "announcementId",
  "entityId",
]);

const DATE_KEYS = new Set(["startsOn", "endsOn"]);

export function isDateField(key: string): boolean {
  return DATE_KEYS.has(key);
}

export function canEditProposal(proposal: AstraProposal): boolean {
  return !proposal.destructive && (proposal.fields?.length ?? 0) > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function readField(raw: unknown): AstraField | null {
  if (!isRecord(raw)) return null;
  const key = raw.key;
  const label = raw.label;
  const type = raw.type;
  if (typeof key !== "string" || key === "" || FROZEN_IDS.has(key)) return null;
  if (typeof label !== "string" || label === "") return null;
  if (type !== "string" && type !== "number" && type !== "boolean") return null;
  const maxLength = raw.maxLength;
  return {
    key,
    label,
    type,
    required: raw.required === true,
    ...(typeof maxLength === "number" && maxLength > 0 ? { maxLength } : {}),
  };
}

export function parseProposal(raw: unknown): AstraProposal | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.actionId !== "string" || raw.actionId === "") return null;
  if (typeof raw.tool !== "string" || raw.tool === "") return null;
  if (typeof raw.summary !== "string") return null;
  const fields = Array.isArray(raw.fields)
    ? raw.fields.map(readField).filter((field): field is AstraField => field != null)
    : [];
  return {
    actionId: raw.actionId,
    checkpointId: typeof raw.checkpointId === "string" ? raw.checkpointId : null,
    tool: raw.tool,
    args: isRecord(raw.args) ? raw.args : {},
    summary: raw.summary,
    destructive: raw.destructive === true,
    ...(fields.length > 0 ? { fields } : {}),
  };
}

/** History row: no kind, and status is already executed or rejected. */
export function parseSettled(raw: unknown): AstraSettled | null {
  if (!isRecord(raw)) return null;
  if (raw.kind === "actionProposal") return null;
  if (raw.status !== "executed" && raw.status !== "rejected") return null;
  if (typeof raw.summary !== "string") return null;
  return {
    summary: raw.summary,
    status: raw.status,
    tool: typeof raw.tool === "string" ? raw.tool : "",
  };
}

/** Pending card only. A settled groundedOn item is not editable. */
export function pendingProposal(raw: unknown): AstraProposal | null {
  if (!isRecord(raw)) return null;
  if (raw.kind !== "actionProposal" || raw.status !== "pending") return null;
  return parseProposal(raw);
}

export function fieldValues(proposal: AstraProposal): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (const field of proposal.fields ?? []) {
    const current = proposal.args[field.key];
    values[field.key] =
      field.type === "boolean" ? current === true : current == null ? "" : String(current);
  }
  return values;
}

export type EditResult =
  | { ok: true; args: Record<string, unknown> | null }
  | { ok: false; errors: Record<string, string> };

/**
 * Args to send on approve. Only keys the admin changed. Null runs the stored
 * payload. Frozen ids are never added, even if a field lists one.
 */
export function proposalEdits(
  proposal: AstraProposal,
  values: Record<string, string | boolean>,
): EditResult {
  const errors: Record<string, string> = {};
  const args: Record<string, unknown> = {};
  for (const field of proposal.fields ?? []) {
    if (FROZEN_IDS.has(field.key)) continue;
    const raw = values[field.key];
    const current = proposal.args[field.key];
    if (field.type === "boolean") {
      const next = raw === true;
      if (next !== (current === true)) args[field.key] = next;
      continue;
    }
    const text = typeof raw === "string" ? raw : "";
    if (field.required && text.trim() === "") {
      errors[field.key] = "Required";
      continue;
    }
    if (field.maxLength != null && text.length > field.maxLength) {
      errors[field.key] = `Keep this under ${field.maxLength} characters`;
      continue;
    }
    if (field.type === "number") {
      if (text.trim() === "") continue;
      const num = Number(text);
      if (!Number.isFinite(num)) {
        errors[field.key] = "Enter a number";
        continue;
      }
      if (num !== current) args[field.key] = num;
      continue;
    }
    if (text !== String(current ?? "")) args[field.key] = text;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, args: Object.keys(args).length > 0 ? args : null };
}
