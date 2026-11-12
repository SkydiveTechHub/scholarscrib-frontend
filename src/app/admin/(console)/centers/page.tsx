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
import { TutorFilterBar } from "@/components/admin/center-filter-bar";
import { Badge } from "@/components/admin/badge";
import {
  CENTER_PAGE_SIZE,
  listAdminTutors,
  tutorName,
} from "@/lib/admin-centers-data";
import {
  normaliseTutorFilter,
  tutorFilterParams,
  type RawTutorParams,
} from "@/lib/admin-centers-filter";
import { CENTER_PLAN_LABELS } from "@/lib/center-subjects";
import { describeAccountStatus } from "@/lib/account-status";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AdminCentersPage({
  searchParams,
}: {
  searchParams: Promise<RawTutorParams>;
}) {
  await requireAdminPage();

  const filter = normaliseTutorFilter(await searchParams);
  const { rows, total, centersByTutor } = await listAdminTutors(filter);
  const win = pageWindow({
    page: filter.page,
    pageSize: CENTER_PAGE_SIZE,
    total,
  });

  return (
    <div>
      <PageHeader
        title="Centers"
        description={`${total} ${total === 1 ? "tutor" : "tutors"} match the current filters.`}
        action={
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/admin/centers/withdrawals"
              className="font-semibold text-muted hover:text-foreground"
            >
              Withdrawals
            </Link>
            <span className="text-border-strong">·</span>
            <Link
              href="/admin/centers/reports"
              className="font-semibold text-muted hover:text-foreground"
            >
              Reports
            </Link>
            <span className="text-border-strong">·</span>
            <Link
              href="/admin/centers/audit"
              className="font-semibold text-muted hover:text-foreground"
            >
              Access audit
            </Link>
          </div>
        }
      />

      <TutorFilterBar filter={filter} />

      {rows.length === 0 ? (
        <EmptyState
          title="No tutors match"
          message="Try widening the filters, or clear the search box."
        />
      ) : (
        <>
          <AdminTable caption="Center tutors">
            <thead>
              <tr className="border-b border-border-strong">
                <AdminTh>Tutor</AdminTh>
                <AdminTh className={HIDE_BELOW.md}>Centers</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh className={HIDE_BELOW.sm}>Verified</AdminTh>
                <AdminTh align="right" className={HIDE_BELOW.lg}>
                  Joined
                </AdminTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = describeAccountStatus({
                  isActive: row.isActive,
                });
                const centers = centersByTutor[row.id] ?? [];
                return (
                  <AdminTr key={row.id}>
                    <AdminTd>
                      <Link
                        href={`/admin/centers/${row.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {tutorName(row)}
                      </Link>
                      <p
                        className={cn(
                          SHOW_BELOW.md,
                          "mt-0.5 break-all text-xs text-muted",
                        )}
                      >
                        {row.email ?? row.phone ?? "—"}
                      </p>
                      <p className={cn(SHOW_BELOW.md, "mt-0.5 text-xs text-muted")}>
                        {centers.length === 0
                          ? "No centers"
                          : centers
                              .map(
                                (c) =>
                                  `${c.name} (${CENTER_PLAN_LABELS[(c.plan ?? "FREE").toUpperCase()] ?? c.plan})`,
                              )
                              .join(", ")}
                      </p>
                    </AdminTd>
                    <AdminTd className={cn(HIDE_BELOW.md, "text-muted")}>
                      {centers.length === 0 ? (
                        "—"
                      ) : (
                        <ul className="space-y-1">
                          {centers.map((c) => (
                            <li key={c.id}>
                              <span className="text-foreground">{c.name}</span>
                              {" · "}
                              {CENTER_PLAN_LABELS[
                                (c.plan ?? "FREE").toUpperCase()
                              ] ?? c.plan}
                              {typeof c.activeStudentCount === "number"
                                ? ` · ${c.activeStudentCount} students`
                                : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                    </AdminTd>
                    <AdminTd>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </AdminTd>
                    <AdminTd className={HIDE_BELOW.sm}>
                      <Badge
                        tone={row.tutorVerifiedAt ? "success" : "neutral"}
                      >
                        {row.tutorVerifiedAt ? "Verified" : "Unverified"}
                      </Badge>
                    </AdminTd>
                    <AdminTd
                      align="right"
                      className={cn(
                        HIDE_BELOW.lg,
                        "whitespace-nowrap tabular-nums text-muted",
                      )}
                    >
                      {row.createdAt
                        ? DATE.format(new Date(row.createdAt))
                        : "—"}
                    </AdminTd>
                  </AdminTr>
                );
              })}
            </tbody>
          </AdminTable>

          <Pagination
            window={win}
            basePath="/admin/centers"
            params={tutorFilterParams({ ...filter, page: 1 })}
          />
        </>
      )}
    </div>
  );
}
