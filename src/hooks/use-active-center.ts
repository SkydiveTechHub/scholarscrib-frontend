"use client";

import { useEffect } from "react";
import { useActiveCenterContext } from "@/components/center-app/active-center-provider";

/**
 * Shared active center for the tutor console. Prefer an explicit id (e.g.
 * `?centerId=`), then the last selection in localStorage, then list order.
 * Must be under `ActiveCenterProvider` (console layout).
 */
export function useActiveCenter(preferredCenterId?: string | null) {
  const ctx = useActiveCenterContext();
  const { preferCenterId } = ctx;

  useEffect(() => {
    preferCenterId(preferredCenterId);
  }, [preferredCenterId, preferCenterId]);

  return ctx;
}
