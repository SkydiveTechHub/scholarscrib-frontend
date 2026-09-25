import { api } from "@/lib/api/server";

/** A subject on the library shelf, shaped as the shelf component renders it. */
export type LibrarySubject = {
  id: string;
  name: string;
  slug: string;
  code: string;
  description: string | null;
  trackCategory: string;
  _count: { resources: number };
};

/** A library resource row (premium URLs are blanked by the backend). */
export type LibraryResource = {
  id: string;
  subjectId: string;
  title: string;
  description: string | null;
  resourceType: string;
  url: string;
  author: string | null;
  isFree: boolean;
  orderIndex: number;
  locked?: boolean;
};

type LibraryResponse =
  | Record<string, unknown>[]
  | { subjects?: Record<string, unknown>[] }
  | { resources?: Record<string, unknown>[] };

function nestedCount(row: Record<string, unknown>): number {
  const count = row._count;
  if (count && typeof count === "object") {
    const value = (count as Record<string, unknown>).resources;
    if (typeof value === "number") return value;
  }
  if (typeof row.resourceCount === "number") return row.resourceCount;
  return 0;
}

/** Backend subjects arrive with loose fields; the shelf needs these exactly. */
function asLibrarySubject(
  row: Record<string, unknown>,
  index: number,
): LibrarySubject {
  return {
    id: String(row.id ?? index),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    code: String(row.code ?? ""),
    description: row.description === null ? null : String(row.description ?? ""),
    trackCategory: String(row.trackCategory ?? ""),
    _count: { resources: nestedCount(row) },
  };
}

function asLibraryResource(row: Record<string, unknown>): LibraryResource {
  const orderIndex = row.orderIndex;
  return {
    id: String(row.id),
    subjectId: String(row.subjectId ?? row.subject_id ?? ""),
    title: String(row.title ?? ""),
    description: row.description === null ? null : String(row.description ?? ""),
    resourceType: String(row.resourceType ?? "PDF"),
    url: String(row.url ?? ""),
    author: row.author === null ? null : String(row.author ?? ""),
    isFree: Boolean(row.isFree),
    orderIndex: typeof orderIndex === "number" ? orderIndex : 0,
    locked: Boolean(row.locked),
  };
}

/**
 * The student's shelf: every subject in a track category relevant to them,
 * filtered server-side by the token. `GET /api/library` returns an array-like
 * collection; tolerate the two common envelope shapes.
 */
export async function getLibraryShelf(): Promise<LibrarySubject[]> {
  const data = await api<LibraryResponse>("/api/library");
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as Record<string, unknown>).subjects)
      ? ((data as Record<string, unknown>).subjects as Record<string, unknown>[])
      : ((data as Record<string, unknown>).resources as Record<string, unknown>[]) ?? [];
  return rows.map(asLibrarySubject);
}

/**
 * Every resource filed under one subject, in shelf order. The backend blanks
 * premium URLs and sets `locked` for callers without the entitlement.
 */
export async function getSubjectResources(subjectId: string): Promise<LibraryResource[]> {
  const data = await api<LibraryResponse>("/api/library", {
    params: { subjectId },
  });
  const record = data as Record<string, unknown>;
  const rows = Array.isArray(data)
    ? data
    : (record.resources as Record<string, unknown>[] | undefined) ??
      (record.subjects as Record<string, unknown>[] | undefined) ??
      [];
  return rows.map(asLibraryResource);
}

/** Shelf lookup that tolerates a failed read, mirroring the old tolerant pair. */
export async function getLibraryShelfTolerant(): Promise<LibrarySubject[]> {
  try {
    return await getLibraryShelf();
  } catch (error) {
    console.error("Library shelf read failed:", error);
    return [];
  }
}