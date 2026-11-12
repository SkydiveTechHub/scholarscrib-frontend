import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-session";
import { DetailShell } from "@/components/admin/detail-shell";
import { Badge } from "@/components/admin/badge";
import {
  TutorDangerZone,
  TutorVerifyControl,
} from "@/components/admin/tutor-controls";
import { getAdminTutor, tutorName } from "@/lib/admin-centers-data";
import { canSuspendStudent } from "@/lib/admin-access";
import { CENTER_PLAN_LABELS } from "@/lib/center-subjects";
import { describeAccountStatus } from "@/lib/account-status";

export const dynamic = "force-dynamic";

const HEADING_CLS =
  "text-[11px] font-semibold uppercase tracking-wider text-muted";
const DATE = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AdminTutorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdminPage();
  const { id } = await params;
  const tutor = await getAdminTutor(id);
  if (!tutor) notFound();

  const status = describeAccountStatus({ isActive: tutor.isActive });
  const centers = tutor.centers ?? [];

  return (
    <DetailShell
      breadcrumb={{ label: "Centers", href: "/admin/centers" }}
      title={tutorName(tutor)}
      subtitle={tutor.email ?? tutor.phone ?? "No contact details"}
      actions={
        <div className="flex flex-wrap gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          <Badge tone={tutor.tutorVerifiedAt ? "success" : "neutral"}>
            {tutor.tutorVerifiedAt ? "Verified" : "Unverified"}
          </Badge>
        </div>
      }
    >
      {!tutor.isActive && (
        <section>
          <h2 className={HEADING_CLS}>Suspension</h2>
          <p className="mt-2 text-sm text-foreground">
            Suspended
            {tutor.suspendedAt
              ? ` ${DATE.format(new Date(tutor.suspendedAt))}`
              : ""}
            {tutor.suspendedReason ? ` — ${tutor.suspendedReason}` : ""}
          </p>
        </section>
      )}

      <section>
        <h2 className={HEADING_CLS}>Profile</h2>
        <dl className="mt-2 grid gap-3 sm:grid-cols-2">
          <Stat label="Email" text={tutor.email ?? "—"} />
          <Stat label="Phone" text={tutor.phone ?? "—"} />
          <Stat
            label="Joined"
            text={
              tutor.createdAt ? DATE.format(new Date(tutor.createdAt)) : "—"
            }
          />
          <Stat label="Centers" value={centers.length} />
        </dl>
      </section>

      <section>
        <h2 className={HEADING_CLS}>Centers</h2>
        {centers.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No centers yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {centers.map((c) => {
              const plan = (c.plan ?? "FREE").toUpperCase();
              return (
                <li
                  key={c.id}
                  className="rounded-lg border border-border-strong bg-card px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{c.name}</span>
                    <Badge tone={plan === "FREE" ? "neutral" : "success"}>
                      {CENTER_PLAN_LABELS[plan] ?? plan}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {[c.lga, c.state].filter(Boolean).join(", ") || "No location"}
                    {" · "}
                    {c.activeStudentCount ?? 0} active students
                    {c.planPaidUntil
                      ? ` · paid until ${DATE.format(new Date(c.planPaidUntil))}`
                      : ""}
                  </p>
                  <Link
                    href={`/admin/centers/audit?centerId=${c.id}`}
                    className="mt-2 inline-block text-sm font-semibold text-muted hover:text-foreground"
                  >
                    Access audit →
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className={HEADING_CLS}>Verification</h2>
        <TutorVerifyControl
          tutorId={tutor.id}
          tutorVerifiedAt={tutor.tutorVerifiedAt}
          canEdit={canSuspendStudent(admin)}
          className="mt-2"
        />
      </section>

      <section>
        <h2 className={HEADING_CLS}>Danger zone</h2>
        <TutorDangerZone
          tutorId={tutor.id}
          tutorName={tutorName(tutor)}
          isActive={tutor.isActive}
          canSuspend={canSuspendStudent(admin)}
          className="mt-2"
        />
      </section>
    </DetailShell>
  );
}

function Stat({
  label,
  value,
  text,
}: {
  label: string;
  value?: number;
  text?: string;
}) {
  return (
    <div className="rounded-lg border border-border-strong bg-card px-4 py-3">
      <dt className={HEADING_CLS}>{label}</dt>
      <dd className="mt-1 break-words text-lg font-bold tabular-nums text-foreground">
        {text ?? value}
      </dd>
    </div>
  );
}
