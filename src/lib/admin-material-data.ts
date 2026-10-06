import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import type { MaterialType } from "@/lib/materials";

/**
 * Backend reads for the admin library. Admin material writes go out from the
 * client components against `/admin/api/materials/...`; this module only
 * reads the subject list and one subject's material rows.
 */

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : String(value);
}

function asFiniteNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value;
}

function rowAs(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

/**
 * Subjects for the console's subject picker, each with its resource count.
 *
 * // backend-ported: assumes `GET /admin/api/materials/subjects` returns
 * `{ subjects: [{ id, name, code, trackCategory, resourceCount }] }` ordered
 * by track category then name. `resourceCount` is mapped into the
 * `_count.resources` field the picker reads. When a row already carries
 * `_count.resources`, it is used as-is.
 */
export async function listMaterialSubjects(): Promise<
  Array<{
    id: string;
    name: string;
    code: string;
    trackCategory: string;
    _count: { resources: number };
  }>
> {
  const payload = rowAs(
    await api<unknown>(endpoints.admin.materials.subjects, { realm: "admin" }),
  );
  const subjects = Array.isArray(payload.subjects)
    ? (payload.subjects as unknown[])
    : [];
  return subjects.map((raw) => {
    const subject = rowAs(raw);
    const nestedCount = rowAs(subject._count);
    const resourceCount =
      nestedCount.resources !== undefined
        ? asFiniteNumber(nestedCount.resources)
        : asFiniteNumber(subject.resourceCount);
    return {
      id: asString(subject.id),
      name: asString(subject.name),
      code: asString(subject.code),
      trackCategory: asString(subject.trackCategory),
      _count: { resources: resourceCount },
    };
  });
}

export interface MaterialRow {
  id: string;
  title: string;
  description: string | null;
  resourceType: MaterialType;
  url: string;
  author: string | null;
  isFree: boolean;
  orderIndex: number;
}

/**
 * One subject's material rows, ordered for display.
 *
 * // backend-ported: assumes `GET /admin/api/materials?subjectId=` returns an
 * array of the `SubjectResource` rows `{ id, title, description?, resourceType,
 * url, author?, isFree, orderIndex }` ordered by `orderIndex` then title.
 */
export async function listMaterials(subjectId: string): Promise<MaterialRow[]> {
  const out = await api<unknown>(endpoints.admin.materials.list, {
    realm: "admin",
    params: { subjectId },
  });
  const rows = Array.isArray(out) ? (out as unknown[]) : [];
  return rows.map((raw) => {
    const resource = rowAs(raw);
    return {
      id: asString(resource.id),
      title: asString(resource.title),
      description: nullableString(resource.description),
      resourceType: asString(resource.resourceType) as MaterialType,
      url: asString(resource.url),
      author: nullableString(resource.author),
      isFree: Boolean(resource.isFree),
      orderIndex: asFiniteNumber(resource.orderIndex),
    };
  });
}