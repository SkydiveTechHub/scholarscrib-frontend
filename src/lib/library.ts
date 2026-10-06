import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";

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

/**
 * The student's shelf: every subject in a track category relevant to them,
 * filtered server-side by the token. `GET /api/library` returns an array-like
 * collection; tolerate the two common envelope shapes.
 */
export async function getLibraryShelf(): Promise<LibrarySubject[]> {
  const data = await api<LibraryResponse>(endpoints.library);
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as Record<string, unknown>).subjects)
      ? ((data as Record<string, unknown>).subjects as Record<string, unknown>[])
      : ((data as Record<string, unknown>).resources as Record<string, unknown>[]) ?? [];
  return rows.map(asLibrarySubject);
}

