"use client";

import Link from "next/link";
import { LuGraduationCap } from "react-icons/lu";
import { CenterEmptyState } from "@/components/center-app/center-empty-state";
import { ComposeRecommendationButton } from "@/components/center-app/compose-recommendation";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCenterRoster } from "@/hooks/api/use-center";
import { useCenterRecommendations } from "@/hooks/api/use-center-recommendations";
import { useActiveCenter } from "@/hooks/use-active-center";
import { isApiError } from "@/lib/api/errors";
import type { CenterRosterMemberOut } from "@/lib/api/types";
import { recommendationStatusLabel } from "@/lib/center-results";

function memberName(m: CenterRosterMemberOut) {
  const name = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
  return name || "Student";
}

export function CenterStudentsPanel() {
  const { centersQuery, center, centerId } = useActiveCenter();
  const roster = useCenterRoster(centerId);
  const recs = useCenterRecommendations(centerId);

  if (centersQuery.isLoading || (centerId && roster.isLoading)) {
    return <Spinner label="Loading students…" />;
  }

  if (!center) {
    return (
      <div className="space-y-4">
        <CenterEmptyState
          title="Create a center first"
          message="Scoped student views need a center and roster."
        />
        <div className="flex justify-center">
          <Link href="/center/onboarding" className={buttonClass("primary", "md")}>
            Set up center
          </Link>
        </div>
      </div>
    );
  }

  if (roster.isError) {
    return (
      <div className="rounded-xl border border-danger/25 bg-danger-soft p-4 text-sm text-danger">
        {isApiError(roster.error)
          ? roster.error.message
          : "Could not load students."}
      </div>
    );
  }

  const active = (roster.data?.members ?? []).filter(
    (m) => (m.status || "").toUpperCase() === "ACTIVE",
  );
  const recentRecs = (recs.data?.recommendations ?? []).slice(0, 8);
  const nameById = new Map(
    active.map((m) => [m.userId, memberName(m)] as const),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <ComposeRecommendationButton
          centerId={center.id}
          toCenter
          label="Recommend to whole center"
        />
      </div>

      {active.length === 0 ? (
        <CenterEmptyState
          title="No active students yet"
          message="When students join via your invite, their assignment-scoped history appears here."
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {active.map((m) => {
            const name = memberName(m);
            return (
              <li
                key={m.userId}
                className="flex flex-wrap items-center gap-3 px-4 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/center/students/${encodeURIComponent(m.userId)}`}
                    className="flex items-center gap-2 truncate text-sm font-semibold text-foreground hover:text-primary"
                  >
                    <LuGraduationCap className="h-4 w-4 flex-shrink-0 text-muted" />
                    {name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {[m.classLevel, m.track].filter(Boolean).join(" · ") ||
                      "Open for assignment-scoped detail"}
                  </p>
                </div>
                <Badge variant="green">Active</Badge>
                <ComposeRecommendationButton
                  centerId={center.id}
                  studentId={m.userId}
                  studentName={name}
                />
              </li>
            );
          })}
        </ul>
      )}

      {recentRecs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">
            Recently sent recommendations
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {recentRecs.map((rec) => (
              <li key={rec.id} className="space-y-1 px-4 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {nameById.get(rec.studentId) || "Student"}
                  </p>
                  <Badge variant="neutral">
                    {recommendationStatusLabel(rec.status)}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted">{rec.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
