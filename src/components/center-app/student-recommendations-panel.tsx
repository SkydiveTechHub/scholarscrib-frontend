"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { LuLightbulb } from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useStudentRecommendations,
  useUpdateStudentRecommendation,
} from "@/hooks/api/use-center-recommendations";
import { isApiError } from "@/lib/api/errors";
import type { RecommendationOut } from "@/lib/api/types";
import { recommendationStatusLabel } from "@/lib/center-results";

function attachmentLinks(rec: RecommendationOut) {
  const a = rec.attachments;
  if (!a) return [] as { href: string; label: string }[];
  const links: { href: string; label: string }[] = [];
  if (a.lessonId) {
    links.push({
      href: `/classroom`,
      label: "Open lesson",
    });
  }
  if (a.assignmentId) {
    links.push({
      href: `/assigned/${encodeURIComponent(a.assignmentId)}`,
      label: "Open assignment",
    });
  }
  if (a.practiceSetId) {
    links.push({ href: "/practice", label: "Practice" });
  }
  return links;
}

function RecommendationCard({ rec }: { rec: RecommendationOut }) {
  const { mutate, mutateAsync, isPending } = useUpdateStudentRecommendation();
  const seenOnce = useRef(false);

  useEffect(() => {
    if (seenOnce.current) return;
    if ((rec.status || "").toLowerCase() !== "delivered") return;
    seenOnce.current = true;
    mutate({
      recommendationId: rec.id,
      body: { status: "seen" },
    });
  }, [rec.id, rec.status, mutate]);

  async function markActed() {
    await mutateAsync({
      recommendationId: rec.id,
      body: { status: "acted" },
    });
  }

  const links = attachmentLinks(rec);
  const status = (rec.status || "delivered").toLowerCase();

  return (
    <li className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">
            {rec.author?.name || "Your tutor"}
            {rec.center?.name ? (
              <span className="font-normal text-muted">
                {" "}
                · {rec.center.name}
              </span>
            ) : null}
          </p>
          {rec.createdAt && (
            <p className="mt-0.5 text-xs text-muted">
              {new Date(rec.createdAt).toLocaleString()}
            </p>
          )}
        </div>
        <Badge
          variant={
            status === "acted" ? "green" : status === "seen" ? "blue" : "amber"
          }
        >
          {recommendationStatusLabel(rec.status)}
        </Badge>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {rec.body}
      </p>

      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              className={buttonClass("secondary", "sm")}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      {status !== "acted" && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => void markActed()}
        >
          Mark done
        </Button>
      )}
    </li>
  );
}

export function StudentRecommendationsPanel() {
  const list = useStudentRecommendations();

  if (list.isLoading) return <Spinner label="Loading recommendations…" />;

  if (list.isError) {
    return (
      <div className="rounded-xl border border-danger/25 bg-danger-soft p-4 text-sm text-danger">
        {isApiError(list.error)
          ? list.error.message
          : "Could not load recommendations."}
      </div>
    );
  }

  const items = list.data?.recommendations ?? [];

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-10 text-center">
        <LuLightbulb className="mx-auto h-8 w-8 text-muted" />
        <h2 className="mt-3 text-base font-bold text-foreground">
          No recommendations yet
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
          When a tutor sends advice about an assignment, it shows up here. Your
          own study plan stays yours.
        </p>
        <Link
          href="/assigned"
          className={buttonClass("secondary", "md") + " mt-4 inline-flex"}
        >
          Assigned work
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((rec) => (
        <RecommendationCard key={rec.id} rec={rec} />
      ))}
    </ul>
  );
}
