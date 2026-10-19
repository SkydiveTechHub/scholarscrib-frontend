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

type LibraryResponse = { subjects?: Record<string, unknown>[] };

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
 * filtered server-side by the token. `GET /api/library` answers `{ subjects }`;
 * a different shape is an error, not an empty shelf.
 */
export async function getLibraryShelf(): Promise<LibrarySubject[]> {
  const data = await api<LibraryResponse>(endpoints.library);
  if (!Array.isArray(data?.subjects)) {
    throw new Error("GET /api/library did not return a subjects list");
  }
  return data.subjects.map(asLibrarySubject);
}

