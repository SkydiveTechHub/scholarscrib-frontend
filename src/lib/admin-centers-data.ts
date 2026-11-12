import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type {
  AdminCenterReportOut,
  AdminCenterReportsPageOut,
  AdminCenterRowOut,
  AdminTutorAccessAuditPageOut,
  AdminTutorDetailOut,
  AdminTutorRowOut,
  AdminTutorsPageOut,
  AdminWithdrawalsPageOut,
  AdminWithdrawRequestOut,
} from "@/lib/api/types";
import type { WithdrawFilter } from "@/lib/admin-centers-filter";

export const CENTER_PAGE_SIZE = 20;
export const REPORT_PAGE_SIZE = 20;
export const ACCESS_AUDIT_PAGE_SIZE = 20;
export const WITHDRAW_PAGE_SIZE = 20;

export type AdminTutorFilter = {
  page: number;
  search: string;
  status: string;
};

export type AdminReportFilter = {
  page: number;
  status: string;
};

export type AdminAccessAuditFilter = {
  page: number;
  centerId: string;
  actorId: string;
};

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : String(value);
}

function asFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return value;
}

function toDate(value: unknown): Date | null {
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function rowAs(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function emptyOnMissing<T>(fallback: T): (error: unknown) => T {
  return (error) => {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 501)
    ) {
      return fallback;
    }
    throw error;
  };
}

function mapCenter(raw: unknown): AdminCenterRowOut {
  const r = rowAs(raw);
  return {
    id: asString(r.id),
    name: asString(r.name, "Center"),
    state: nullableString(r.state),
    lga: nullableString(r.lga),
    plan: (nullableString(r.plan) as AdminCenterRowOut["plan"]) ?? "FREE",
    planPaidUntil: nullableString(r.planPaidUntil),
    activeStudentCount: asFiniteNumber(r.activeStudentCount, 0),
    archivedAt: nullableString(r.archivedAt),
    createdAt: nullableString(r.createdAt),
    ownerId: nullableString(r.ownerId),
  };
}

function mapTutor(raw: unknown): AdminTutorRowOut {
  const r = rowAs(raw);
  const centers = Array.isArray(r.centers) ? r.centers.map(mapCenter) : [];
  const emailVerified =
    typeof r.emailVerified === "boolean" || typeof r.emailVerified === "string"
      ? r.emailVerified
      : r.emailVerified == null
        ? null
        : String(r.emailVerified);
  return {
    id: asString(r.id),
    firstName: nullableString(r.firstName),
    lastName: nullableString(r.lastName),
    email: nullableString(r.email),
    phone: nullableString(r.phone),
    isActive: r.isActive !== false,
    emailVerified,
    tutorVerifiedAt: nullableString(r.tutorVerifiedAt),
    suspendedAt: nullableString(r.suspendedAt),
    suspendedReason: nullableString(r.suspendedReason),
    centerCount: centers.length || asFiniteNumber(r.centerCount, 0),
    createdAt: nullableString(r.createdAt),
    lastActiveAt: nullableString(r.lastActiveAt),
  };
}

export function tutorName(tutor: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
} | null | undefined): string {
  if (!tutor) return "—";
  const name = [tutor.firstName, tutor.lastName].filter(Boolean).join(" ").trim();
  return name || tutor.email || "Tutor";
}

export async function listAdminTutors(
  filter: AdminTutorFilter,
): Promise<{ rows: AdminTutorRowOut[]; total: number; centersByTutor: Record<string, AdminCenterRowOut[]> }> {
  const params: Record<string, string | number> = {
    page: filter.page,
    pageSize: CENTER_PAGE_SIZE,
  };
  if (filter.search) params.q = filter.search;
  if (filter.status) params.status = filter.status;

  const out = await api<AdminTutorsPageOut>(endpoints.admin.centers.tutors, {
    realm: "admin",
    params,
  }).catch(
    emptyOnMissing({
      tutors: [],
      pagination: { page: 1, pageSize: CENTER_PAGE_SIZE, total: 0 },
    }),
  );

  const centersByTutor: Record<string, AdminCenterRowOut[]> = {};
  const rows = (out.tutors ?? []).map((raw) => {
    const r = rowAs(raw);
    const centers = Array.isArray(r.centers) ? r.centers.map(mapCenter) : [];
    const tutor = mapTutor(raw);
    centersByTutor[tutor.id] = centers;
    return tutor;
  });
  const total = out.pagination?.total ?? rows.length;
  return { rows, total, centersByTutor };
}

export async function getAdminTutor(
  tutorId: string,
): Promise<(AdminTutorDetailOut & { centers: AdminCenterRowOut[] }) | null> {
  try {
    const out = await api<{ tutor: AdminTutorDetailOut } | AdminTutorDetailOut>(
      endpoints.admin.centers.tutor(tutorId),
      { realm: "admin" },
    );
    const payload =
      out && typeof out === "object" && "tutor" in out
        ? (out as { tutor: AdminTutorDetailOut }).tutor
        : (out as AdminTutorDetailOut);
    const centers = Array.isArray(payload.centers)
      ? payload.centers.map(mapCenter)
      : [];
    return { ...mapTutor(payload), centers };
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 501)
    ) {
      return null;
    }
    throw error;
  }
}

export async function listCenterReports(
  filter: AdminReportFilter,
): Promise<{ rows: AdminCenterReportOut[]; total: number }> {
  const params: Record<string, string | number> = {
    page: filter.page,
    pageSize: REPORT_PAGE_SIZE,
  };
  if (filter.status) params.status = filter.status;

  const out = await api<AdminCenterReportsPageOut>(
    endpoints.admin.centers.reports,
    { realm: "admin", params },
  ).catch(
    emptyOnMissing({
      reports: [],
      pagination: { page: 1, pageSize: REPORT_PAGE_SIZE, total: 0 },
    }),
  );

  const rows = out.reports ?? [];
  const total = out.pagination?.total ?? rows.length;
  return { rows, total };
}

export async function listTutorAccessAudit(
  filter: AdminAccessAuditFilter,
): Promise<{
  rows: Array<{
    id: string;
    actorId: string;
    centerId: string;
    action: string;
    resource: string;
    studentId: string | null;
    createdAt: Date | null;
  }>;
  total: number;
}> {
  const params: Record<string, string | number> = {
    page: filter.page,
    pageSize: ACCESS_AUDIT_PAGE_SIZE,
  };
  if (filter.centerId) params.centerId = filter.centerId;
  if (filter.actorId) params.actorId = filter.actorId;

  const out = await api<
    AdminTutorAccessAuditPageOut & { audits?: AdminTutorAccessAuditPageOut["entries"] }
  >(endpoints.admin.centers.accessAudit, { realm: "admin", params }).catch(
    emptyOnMissing({
      entries: [],
      audits: [],
      pagination: { page: 1, pageSize: ACCESS_AUDIT_PAGE_SIZE, total: 0 },
    }),
  );

  const entries = out.audits ?? out.entries ?? [];
  const rows = entries.map((entry) => ({
    id: asString(entry.id),
    actorId: asString(entry.actorId),
    centerId: asString(entry.centerId),
    action: asString(entry.action),
    resource: asString(entry.resource, "—"),
    studentId: nullableString(entry.studentId),
    createdAt: toDate(entry.createdAt),
  }));
  const total = out.pagination?.total ?? rows.length;
  return { rows, total };
}

function mapWithdraw(raw: unknown): AdminWithdrawRequestOut {
  const r = rowAs(raw);
  const ownerRaw = rowAs(r.owner);
  const payout = rowAs(r.payoutDetails);
  const ownerNameFromParts = [ownerRaw.firstName, ownerRaw.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    id: asString(r.id),
    ownerId: nullableString(r.ownerId),
    ownerName: nullableString(r.ownerName) ?? (ownerNameFromParts || null),
    ownerEmail: nullableString(r.ownerEmail) ?? nullableString(ownerRaw.email),
    amountKobo: asFiniteNumber(r.amountKobo),
    status: asString(r.status, "PENDING").toUpperCase(),
    payoutDetails:
      Object.keys(payout).length > 0
        ? {
            accountName: asString(payout.accountName),
            accountNumber: asString(payout.accountNumber),
            bankCode: asString(payout.bankCode),
            bankName: nullableString(payout.bankName),
            note: nullableString(payout.note),
          }
        : null,
    note: nullableString(r.note),
    resolutionNote: nullableString(r.resolutionNote),
    resolvedAt: nullableString(r.resolvedAt),
    resolvedById: nullableString(r.resolvedById),
    createdAt: asString(r.createdAt),
    updatedAt: nullableString(r.updatedAt),
    owner:
      ownerRaw.id || ownerRaw.email
        ? {
            id: asString(ownerRaw.id, asString(r.ownerId)),
            email: nullableString(ownerRaw.email),
            firstName: nullableString(ownerRaw.firstName),
            lastName: nullableString(ownerRaw.lastName),
            tutorVerifiedAt: nullableString(ownerRaw.tutorVerifiedAt),
          }
        : null,
  };
}

export async function listCenterWithdrawals(
  filter: WithdrawFilter,
): Promise<{ rows: AdminWithdrawRequestOut[]; total: number }> {
  const params: Record<string, string | number> = {
    page: filter.page,
    pageSize: WITHDRAW_PAGE_SIZE,
  };
  if (filter.status) params.status = filter.status;

  const out = await api<AdminWithdrawalsPageOut>(
    endpoints.admin.centers.withdrawals,
    { realm: "admin", params },
  ).catch(
    emptyOnMissing<AdminWithdrawalsPageOut>({
      items: [],
      withdrawals: [],
      requests: [],
      page: 1,
      pageSize: WITHDRAW_PAGE_SIZE,
      total: 0,
      pagination: { page: 1, pageSize: WITHDRAW_PAGE_SIZE, total: 0 },
    }),
  );

  const rows = (out.items ?? out.withdrawals ?? out.requests ?? []).map(
    mapWithdraw,
  );
  const total = out.total ?? out.pagination?.total ?? rows.length;
  return { rows, total };
}
