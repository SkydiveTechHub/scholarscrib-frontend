export type RawTutorParams = {
  q?: string;
  status?: string;
  page?: string;
};

export type RawReportParams = {
  status?: string;
  page?: string;
};

export type RawAccessAuditParams = {
  centerId?: string;
  actorId?: string;
  page?: string;
};

export type RawWithdrawParams = {
  status?: string;
  page?: string;
};

export type TutorFilter = {
  search: string;
  status: string;
  page: number;
};

export type ReportFilter = {
  status: string;
  page: number;
};

export type AccessAuditFilter = {
  centerId: string;
  actorId: string;
  page: number;
};

export type WithdrawFilter = {
  status: string;
  page: number;
};

function pageNum(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function normaliseTutorFilter(raw: RawTutorParams): TutorFilter {
  return {
    search: (raw.q ?? "").trim(),
    status: (raw.status ?? "").trim().toLowerCase(),
    page: pageNum(raw.page),
  };
}

export function tutorFilterParams(filter: TutorFilter): Record<string, string> {
  const params: Record<string, string> = {};
  if (filter.search) params.q = filter.search;
  if (filter.status) params.status = filter.status;
  if (filter.page > 1) params.page = String(filter.page);
  return params;
}

export function normaliseReportFilter(raw: RawReportParams): ReportFilter {
  return {
    status: (raw.status ?? "").trim().toUpperCase(),
    page: pageNum(raw.page),
  };
}

export function reportFilterParams(filter: ReportFilter): Record<string, string> {
  const params: Record<string, string> = {};
  if (filter.status) params.status = filter.status;
  if (filter.page > 1) params.page = String(filter.page);
  return params;
}

export function normaliseAccessAuditFilter(
  raw: RawAccessAuditParams,
): AccessAuditFilter {
  return {
    centerId: (raw.centerId ?? "").trim(),
    actorId: (raw.actorId ?? "").trim(),
    page: pageNum(raw.page),
  };
}

export function normaliseWithdrawFilter(raw: RawWithdrawParams): WithdrawFilter {
  return {
    status: (raw.status ?? "").trim().toUpperCase(),
    page: pageNum(raw.page),
  };
}

export function withdrawFilterParams(
  filter: WithdrawFilter,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (filter.status) params.status = filter.status;
  if (filter.page > 1) params.page = String(filter.page);
  return params;
}

export function accessAuditFilterParams(
  filter: AccessAuditFilter,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (filter.centerId) params.centerId = filter.centerId;
  if (filter.actorId) params.actorId = filter.actorId;
  if (filter.page > 1) params.page = String(filter.page);
  return params;
}
