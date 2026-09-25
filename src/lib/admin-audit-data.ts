import { api } from "@/lib/api/server";
import { AUDIT_PAGE_SIZE, type AuditFilter } from "@/lib/admin-audit-filter";

/**
 * Backend reads for the admin audit log.
 */

export interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
  createdAt: Date;
  actorLabel: string;
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : String(value);
}

function toDate(value: unknown): Date | null {
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function rowAs(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

/**
 * One page of audit entries, newest first.
 *
 * // backend-ported: assumes `GET /admin/api/audit` accepts `actor`, `action`,
 * `entity`, `from`, `to`, `page`, `pageSize`, and returns an envelope
 * `{ entries: [{ id, action, entity, entityId?, summary, createdAt, actor:
 * { email?, username? } }], pagination: { total } }`. `actorLabel` can also be
 * supplied directly.
 */
export async function listAuditEntries(
  filter: AuditFilter,
): Promise<{ rows: AuditRow[]; total: number }> {
  const params: Record<string, string> = {
    ...(filter.actorId ? { actor: filter.actorId } : {}),
    ...(filter.action ? { action: filter.action } : {}),
    ...(filter.entity ? { entity: filter.entity } : {}),
    ...(filter.from ? { from: filter.from.toISOString().slice(0, 10) } : {}),
    ...(filter.to ? { to: filter.to.toISOString().slice(0, 10) } : {}),
    page: String(filter.page),
    pageSize: String(AUDIT_PAGE_SIZE),
  };

  const out = rowAs(
    await api<unknown>("/admin/api/audit", { realm: "admin", params }),
  );
  const entries = Array.isArray(out.entries)
    ? (out.entries as unknown[])
    : [];
  const pagination = rowAs(out.pagination);
  const rawTotal = pagination.total;
  const total =
    typeof rawTotal === "number" && Number.isFinite(rawTotal)
      ? rawTotal
      : entries.length;

  return {
    total,
    rows: entries.map((raw) => {
      const entry = rowAs(raw);
      const actor = rowAs(entry.actor);
      return {
        id: asString(entry.id),
        action: asString(entry.action),
        entity: asString(entry.entity),
        entityId: nullableString(entry.entityId),
        summary: asString(entry.summary),
        createdAt: toDate(entry.createdAt) ?? new Date(0),
        actorLabel:
          (typeof entry.actorLabel === "string" && entry.actorLabel) ||
          asString(actor.email) ||
          asString(actor.username) ||
          "Unknown admin",
      };
    }),
  };
}

/**
 * Actors who have actually acted, for the filter dropdown.
 *
 * // backend-ported: assumes `GET /admin/api/audit/actors` returns either
 * `[{ id, email?, username? }]` or an envelope `{ actors: [...] }`.
 */
export async function listAuditActors(): Promise<
  Array<{ id: string; label: string }>
> {
  const out = await api<unknown>("/admin/api/audit/actors", { realm: "admin" });
  const actors = Array.isArray(out)
    ? out
    : Array.isArray(rowAs(out).actors)
      ? (rowAs(out).actors as unknown[])
      : [];
  return actors.map((raw) => {
    const actor = rowAs(raw);
    const id = asString(actor.id);
    return {
      id,
      label: asString(actor.label) || asString(actor.email) || asString(actor.username) || id,
    };
  });
}