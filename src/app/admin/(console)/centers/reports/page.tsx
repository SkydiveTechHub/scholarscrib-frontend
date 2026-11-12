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
import {
  REPORT_PAGE_SIZE,
  listCenterReports,
} from "@/lib/admin-centers-data";
import {
  normaliseReportFilter,
  reportFilterParams,
  type RawReportParams,
} from "@/lib/admin-centers-filter";

export const dynamic = "force-dynamic";

const STAMP = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function reportTone(
  status: string,
): "neutral" | "info" | "success" | "warning" {
  switch (status.toUpperCase()) {
    case "OPEN":
      return "warning";
    case "REVIEWING":
      return "info";
    case "RESOLVED":
      return "success";
    default:
      return "neutral";
  }
}

export default async function AdminCenterReportsPage({
  searchParams,
}: {
  searchParams: Promise<RawReportParams>;
}) {
  await requireAdminPage();

  const filter = normaliseReportFilter(await searchParams);
  const { rows, total } = await listCenterReports(filter);
  const win = pageWindow({
    page: filter.page,
    pageSize: REPORT_PAGE_SIZE,
    total,
  });

  return (
    <div>
      <PageHeader
        title="Center reports"
        description="Abuse / safety queue for tutor centers (X-7). Intake can land empty until student report flows ship."
        action={
          <Link
            href="/admin/centers"
            className="text-sm font-semibold text-muted hover:text-foreground"
          >
            ← Centers
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No reports in the queue"
          message="When students report a tutor, invite, or recommendation, they will show up here for review."
        />
      ) : (
        <>
          <AdminTable caption="Center abuse reports">
            <thead>
              <tr className="border-b border-border-strong">
                <AdminTh className={HIDE_BELOW.sm}>When</AdminTh>
                <AdminTh>Kind</AdminTh>
                <AdminTh className={HIDE_BELOW.md}>Center</AdminTh>
                <AdminTh>Reason</AdminTh>
                <AdminTh>Status</AdminTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <AdminTr key={row.id}>
                  <AdminTd
                    className={cn(
                      HIDE_BELOW.sm,
                      "whitespace-nowrap tabular-nums text-muted",
                    )}
                  >
                    {row.createdAt
                      ? STAMP.format(new Date(row.createdAt))
                      : "—"}
                  </AdminTd>
                  <AdminTd className="font-medium">{row.kind}</AdminTd>
                  <AdminTd className={cn(HIDE_BELOW.md, "text-muted")}>
                    {row.centerName ?? row.centerId ?? "—"}
                  </AdminTd>
                  <AdminTd className="max-w-sm truncate text-muted">
                    {row.reason}
                  </AdminTd>
                  <AdminTd>
                    <Badge tone={reportTone(row.status)}>{row.status}</Badge>
                  </AdminTd>
                </AdminTr>
              ))}
            </tbody>
          </AdminTable>

          <Pagination
            window={win}
            basePath="/admin/centers/reports"
            params={reportFilterParams({ ...filter, page: 1 })}
          />
        </>
      )}
    </div>
  );
}
