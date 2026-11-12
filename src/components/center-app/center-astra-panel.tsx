"use client";

import Link from "next/link";
import { CenterAstraApp } from "@/components/center-app/center-astra-app";
import { CenterEmptyState } from "@/components/center-app/center-empty-state";
import { buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useActiveCenter } from "@/hooks/use-active-center";
import { isCenterOwnerRole } from "@/lib/center-subjects";

/**
 * Tutor Astra console surface (AI-1). Owners and facilitators share the
 * center token pool; only owners can top up.
 */
export function CenterAstraPanel({
  preferredCenterId,
}: {
  preferredCenterId?: string | null;
}) {
  const { centersQuery, center } = useActiveCenter(preferredCenterId);
  const canTopUp = center ? isCenterOwnerRole(center.staffRole) : false;

  if (centersQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (!center) {
    return (
      <div className="space-y-4">
        <CenterEmptyState
          title="No center yet"
          message="Create your center first, then open Tutor Astra for assignment-scoped help."
        />
        <Link
          href="/center/onboarding"
          className={buttonClass("primary", "md", "w-full sm:w-auto")}
        >
          Set up your center
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Scoped to <span className="font-semibold text-foreground">{center.name}</span>
        . Astra only sees results from work this center assigned.
      </p>
      <CenterAstraApp centerId={center.id} canTopUp={canTopUp} />
    </div>
  );
}
