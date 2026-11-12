import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-session";
import { PageHeader } from "@/components/ui/page-header";
import {
  AdminTable,
  AdminTd,
  AdminTh,
  AdminTr,
  HIDE_BELOW,
  SHOW_BELOW,
} from "@/components/admin/admin-table";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/admin/empty-state";
import { Pagination, pageWindow } from "@/components/ui/pagination";
import {
  ACCESS_AUDIT_PAGE_SIZE,
  listTutorAccessAudit,
} from "@/lib/admin-centers-data";
import {
  accessAuditFilterParams,
  normaliseAccessAuditFilter,
  type RawAccessAuditParams,
} from "@/lib/admin-centers-filter";

export const dynamic = "force-dynamic";

const STAMP = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminCenterAccessAuditPage({
  searchParams,
}: {
  searchParams: Promise<RawAccessAuditParams>;
}) {
  await requireAdminPage();

  const filter = normaliseAccessAuditFilter(await searchParams);
  const { rows, total } = await listTutorAccessAudit(filter);
  const win = pageWindow({
    page: filter.page,
    pageSize: ACCESS_AUDIT_PAGE_SIZE,
    total,
  });

  return (
    <div>
      <PageHeader
        title="Tutor access audit"
        description={`${total} recorded ${total === 1 ? "read" : "reads"} of student results (X-2).`}
        action={
          <Link
            href="/admin/centers"
            className="text-sm font-semibold text-muted hover:text-foreground"
          >
            ← Centers
          </Link>
        }
      />

      {(filter.centerId || filter.actorId) && (
        <p className="mb-4 text-sm text-muted">
          {filter.centerId ? (
            <>
              Center{" "}
              <code className="text-xs text-foreground">{filter.centerId}</code>
            </>
          ) : null}
          {filter.centerId && filter.actorId ? " · " : null}
          {filter.actorId ? (
            <>
              Actor{" "}
              <code className="text-xs text-foreground">{filter.actorId}</code>
            </>
          ) : null}
          .{" "}
          <Link href="/admin/centers/audit" className="font-semibold underline">
            Clear filters
          </Link>
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No access events yet"
          message="When tutors open assignment results or scoped student detail, those reads appear here."
        />
      ) : (
        <>
          <AdminTable caption="Tutor access audit">
            <thead>
              <tr className="border-b border-border-strong">
                <AdminTh className={HIDE_BELOW.sm}>When</AdminTh>
                <AdminTh className={HIDE_BELOW.md}>Actor</AdminTh>
                <AdminTh className={HIDE_BELOW.md}>Center</AdminTh>
                <AdminTh>Action</AdminTh>
                <AdminTh className={HIDE_BELOW.lg}>Resource</AdminTh>
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
                    {row.createdAt ? STAMP.format(row.createdAt) : "—"}
                  </AdminTd>
                  <AdminTd className={cn(HIDE_BELOW.md, "font-mono text-xs text-muted")}>
                    {row.actorId}
                  </AdminTd>
                  <AdminTd className={cn(HIDE_BELOW.md, "font-mono text-xs text-muted")}>
                    {row.centerId}
                  </AdminTd>
                  <AdminTd>
                    <span className="font-medium">{row.action}</span>
                    <p className={cn(SHOW_BELOW.md, "mt-0.5 font-mono text-xs text-muted")}>
                      {row.actorId} · {row.centerId}
                    </p>
                  </AdminTd>
                  <AdminTd
                    className={cn(HIDE_BELOW.lg, "max-w-xs truncate text-muted")}
                  >
                    {row.resource}
                  </AdminTd>
                </AdminTr>
              ))}
            </tbody>
          </AdminTable>

          <Pagination
            window={win}
            basePath="/admin/centers/audit"
            params={accessAuditFilterParams({ ...filter, page: 1 })}
          />
        </>
      )}
    </div>
  );
}
