import { api } from "@/lib/api/server";
import type { StudentsPageOut } from "@/lib/api/types";
import { STUDENT_PAGE_SIZE, type StudentFilter } from "@/lib/admin-student";
import type { SubscriptionTier } from "@/lib/subscription";
import type { ClassLevel } from "@/lib/curriculum-scope";
import type { Track } from "@/lib/admin-student";

/**
 * Backend reads for the admin student pages. Every admin mutation (profile,
 * tier, suspension, sign-out, delete) is issued directly by the client
 * components against `/admin/api/students/...`; this module only reads.
 */

export interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  classLevel: ClassLevel | null;
  track: Track | null;
  tier: SubscriptionTier;
  isActive: boolean;
  createdAt: Date;
  /** Most recent learning event; null for an account that never studied. */
  lastActiveAt: Date | null;
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

function asFiniteNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value;
}

/** ISO strings from the backend become the Date objects the pages format. */
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
 * One page of student accounts.
 *
 * // backend-ported: assumes `GET /admin/api/students` accepts `q`, `class`,
 * `track`, `tier`, `status`, `state` (`none` = state not set), `page` and
 * `pageSize`, and returns the `StudentsPageOut` envelope
 * `{ students, pagination: { page, pageSize, total } }` ordered newest first.
 */
export async function listStudents(
  filter: StudentFilter,
): Promise<{ rows: StudentRow[]; total: number }> {
  const params: Record<string, string | number> = {
    page: filter.page,
    pageSize: STUDENT_PAGE_SIZE,
  };
  if (filter.search) params.q = filter.search;
  if (filter.classLevel) params.class = filter.classLevel;
  if (filter.track) params.track = filter.track;
  if (filter.tier) params.tier = filter.tier;
  if (filter.status) params.status = filter.status;
  if (filter.state) params.state = filter.state;

  const out = await api<StudentsPageOut>("/admin/api/students", {
    realm: "admin",
    params,
  });
  const students = Array.isArray(out?.students) ? out.students : [];
  const total = out?.pagination?.total ?? students.length;

  return {
    total,
    rows: students.map((raw) => {
      const u = rowAs(raw);
      return {
        id: asString(u.id),
        firstName: asString(u.firstName),
        lastName: asString(u.lastName),
        email: nullableString(u.email),
        phone: nullableString(u.phone),
        classLevel: nullableString(u.classLevel) as ClassLevel | null,
        track: nullableString(u.track) as Track | null,
        tier: (nullableString(u.tier) as SubscriptionTier) ?? "FREEMIUM",
        isActive: Boolean(u.isActive),
        createdAt: toDate(u.createdAt) ?? new Date(0),
        lastActiveAt: toDate(u.lastActiveAt),
      };
    }),
  };
}

export interface StudentDetail extends StudentRow {
  state: string | null;
  schoolId: string | null;
  schoolName: string | null;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  tierUpdatedAt: Date | null;
  attemptCount: number;
  masteredTopicCount: number;
  flashcardReviewCount: number;
}

/**
 * A single student with their activity counts.
 *
 * // backend-ported: assumes `GET /admin/api/students/{id}` returns the
 * student row with `lastActiveAt`, `suspendedAt`, `suspendedReason`,
 * `tierUpdatedAt` and the `attemptCount` / `masteredTopicCount` /
 * `flashcardReviewCount` totals. Null/404 → null.
 */
export async function getStudentDetail(id: string): Promise<StudentDetail | null> {
  const out = await api<unknown>(`/admin/api/students/${id}`, { realm: "admin" });
  const u = rowAs(out);
  if (!asString(u.id)) return null;

  return {
    id: asString(u.id),
    firstName: asString(u.firstName),
    lastName: asString(u.lastName),
    email: nullableString(u.email),
    phone: nullableString(u.phone),
    classLevel: nullableString(u.classLevel) as ClassLevel | null,
    track: nullableString(u.track) as Track | null,
    state: nullableString(u.state),
    schoolId: nullableString(u.schoolId),
    schoolName: nullableString(u.schoolName),
    tier: (nullableString(u.tier) as SubscriptionTier) ?? "FREEMIUM",
    tierUpdatedAt: toDate(u.tierUpdatedAt),
    isActive: Boolean(u.isActive),
    suspendedAt: toDate(u.suspendedAt),
    suspendedReason: nullableString(u.suspendedReason),
    createdAt: toDate(u.createdAt) ?? new Date(0),
    lastActiveAt: toDate(u.lastActiveAt),
    attemptCount: asFiniteNumber(u.attemptCount),
    masteredTopicCount: asFiniteNumber(u.masteredTopicCount),
    flashcardReviewCount: asFiniteNumber(u.flashcardReviewCount),
  };
}

/**
 * What deleting this account would destroy, per relation.
 *
 * // backend-ported: assumes `GET /admin/api/students/{id}/deletion-impact`
 * returns `{ impact: { assessment_attempts, question_responses,
 * student_progress, topic_mastery, learning_events, flashcard_reviews,
 * flashcard_decks } }`. Unknown keys default to 0 and unknown provided keys
 * are dropped, so the danger zone's "no associated records" fallback still
 * works against a partial payload.
 */
export async function getStudentDeletionImpact(
  id: string,
): Promise<Record<string, number>> {
  const out = rowAs(
    await api<unknown>(`/admin/api/students/${id}/deletion-impact`, {
      realm: "admin",
    }),
  );
  const impact = rowAs(out.impact);

  const labels: Record<string, string> = {
    assessment_attempts: "Assessment attempts",
    question_responses: "Question responses",
    student_progress: "Progress records",
    topic_mastery: "Topic mastery records",
    learning_events: "Learning events",
    flashcard_reviews: "Flashcard reviews",
    flashcard_decks: "Authored flashcard decks",
  };

  const result: Record<string, number> = {};
  for (const [key, label] of Object.entries(labels)) {
    result[label] = asFiniteNumber(impact[key]);
  }
  return result;
}