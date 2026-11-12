import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-session";
import { PageHeader } from "@/components/ui/page-header";
import {
  AdminTable,
  AdminTd,
  AdminTh,
  AdminTr,
  HIDE_BELOW,
} from "@/components/admin/admin-table";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/admin/empty-state";
import { Pagination, pageWindow } from "@/components/ui/pagination";
import { Badge } from "@/components/admin/badge";
import { WithdrawResolveControls } from "@/components/admin/withdraw-controls";
import {
  WITHDRAW_PAGE_SIZE,
  listCenterWithdrawals,
} from "@/lib/admin-centers-data";
import {
  normaliseWithdrawFilter,
  withdrawFilterParams,
  type RawWithdrawParams,
} from "@/lib/admin-centers-filter";
import { amountLabel } from "@/lib/billing-plans";

export const dynamic = "force-dynamic";

const STAMP = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "FULFILLED", label: "Fulfilled" },
  { value: "REJECTED", label: "Rejected" },
] as const;

function statusTone(
  status: string,
): "neutral" | "info" | "success" | "warning" {
  switch (status.toUpperCase()) {
    case "PENDING":
      return "warning";
    case "FULFILLED":
      return "success";
    case "REJECTED":
      return "info";
    default:
      return "neutral";
  }
}

function ownerLabel(row: {
  ownerName?: string | null;
  ownerEmail?: string | null;
  owner?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  ownerId?: string | null;
}) {
  const fromOwner = [row.owner?.firstName, row.owner?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return (
    row.ownerName ||
    fromOwner ||
    row.ownerEmail ||
    row.owner?.email ||
    row.ownerId ||
    "—"
  );
}

function payoutSummary(
  details:
    | {
        accountName?: string;
        accountNumber?: string;
        bankCode?: string;
        bankName?: string | null;
      }
    | Record<string, unknown>
    | null
    | undefined,
) {
  if (!details || typeof details !== "object") return "—";
  const d = details as {
    accountName?: string;
    accountNumber?: string;
    bankCode?: string;
    bankName?: string | null;
  };
  const parts = [
    d.accountName,
    d.accountNumber,
    d.bankName || d.bankCode,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export default async function AdminCenterWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<RawWithdrawParams>;
}) {
  await requireAdminPage();

  const filter = normaliseWithdrawFilter(await searchParams);
  const { rows, total } = await listCenterWithdrawals(filter);
  const win = pageWindow({
    page: filter.page,
    pageSize: WITHDRAW_PAGE_SIZE,
    total,
  });

  return (
    <div>
      <PageHeader
        title="Withdrawals"
        description="Referral wallet payout queue (D11). Fulfil after you send the transfer; reject returns the hold to the tutor wallet."
        action={
          <Link
            href="/admin/centers"
            className="text-sm font-semibold text-muted hover:text-foreground"
          >
            ← Centers
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((opt) => {
          const active = filter.status === opt.value;
          const href =
            opt.value === ""
              ? "/admin/centers/withdrawals"
              : `/admin/centers/withdrawals?status=${opt.value}`;
          return (
            <Link
              key={opt.value || "all"}
              href={href}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-semibold",
                active
                  ? "border-primary/40 bg-primary-soft text-primary"
                  : "border-border bg-card text-muted hover:text-foreground",
              )}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No withdraw requests"
          message="When tutors request a payout from their referral wallet, they show up here for ops fulfilment."
        />
      ) : (
        <>
          <AdminTable caption="Wallet withdraw requests">
            <thead>
              <tr className="border-b border-border-strong">
                <AdminTh className={HIDE_BELOW.sm}>When</AdminTh>
                <AdminTh>Tutor</AdminTh>
                <AdminTh>Amount</AdminTh>
                <AdminTh className={HIDE_BELOW.md}>Payout</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh className={HIDE_BELOW.lg}>Actions</AdminTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = row.status.toUpperCase();
                const tutorHref = row.ownerId
                  ? `/admin/centers/${row.ownerId}`
                  : null;
                return (
                  <AdminTr key={row.id}>
                    <AdminTd
                      className={cn(
                        HIDE_BELOW.sm,
                        "whitespace-nowrap text-muted",
                      )}
                    >
                      {row.createdAt
                        ? STAMP.format(new Date(row.createdAt))
                        : "—"}
                    </AdminTd>
                    <AdminTd>
                      {tutorHref ? (
                        <Link
                          href={tutorHref}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {ownerLabel(row)}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">
                          {ownerLabel(row)}
                        </span>
                      )}
                      {(row.ownerEmail || row.owner?.email) && (
                        <p className="mt-0.5 break-all text-xs text-muted">
                          {row.ownerEmail || row.owner?.email}
                        </p>
                      )}
                    </AdminTd>
                    <AdminTd className="font-semibold tabular-nums">
                      {amountLabel(row.amountKobo)}
                    </AdminTd>
                    <AdminTd className={cn(HIDE_BELOW.md, "text-sm text-muted")}>
                      {payoutSummary(row.payoutDetails)}
                      {row.note ? (
                        <p className="mt-1 text-xs">Note: {row.note}</p>
                      ) : null}
                    </AdminTd>
                    <AdminTd>
                      <Badge tone={statusTone(status)}>{status}</Badge>
                      {row.resolutionNote ? (
                        <p className="mt-1 text-xs text-muted">
                          {row.resolutionNote}
                        </p>
                      ) : null}
                    </AdminTd>
                    <AdminTd className={HIDE_BELOW.lg}>
                      <WithdrawResolveControls
                        withdrawalId={row.id}
                        status={status}
                      />
                    </AdminTd>
                  </AdminTr>
                );
              })}
            </tbody>
          </AdminTable>

          {/* Mobile actions under each pending row would be heavy; keep a
              compact note for small screens. */}
          <div className="mt-4 space-y-3 lg:hidden">
            {rows
              .filter((r) => r.status.toUpperCase() === "PENDING")
              .map((row) => (
                <div
                  key={`${row.id}-mobile`}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {ownerLabel(row)} · {amountLabel(row.amountKobo)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {payoutSummary(row.payoutDetails)}
                  </p>
                  <WithdrawResolveControls
                    className="mt-3"
                    withdrawalId={row.id}
                    status={row.status}
                  />
                </div>
              ))}
          </div>

          <Pagination
            window={win}
            basePath="/admin/centers/withdrawals"
            params={withdrawFilterParams({ ...filter, page: 1 })}
          />
        </>
      )}
    </div>
  );
}
