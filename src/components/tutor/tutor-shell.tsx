"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { LuStar } from "react-icons/lu";
import { useExamActive } from "@/stores/exam-store";
import { useTutorStore } from "@/stores/tutor-store";
import { isTawkConfigured } from "@/lib/tawk-config";
import { syncTawkVisibility } from "@/lib/tawk-browser";
import type { SubscriptionTier } from "@/lib/subscription";
import { cn } from "@/lib/utils";

// The panel, KaTeX and the chat code load on first open, not with the page:
// most students are on metered data and most page views never open Astra.
const TutorPanel = dynamic(() => import("./tutor-panel"), { ssr: false });

// Lift Ask Astra above the Tawk bubble (~4.5rem) when the embed is enabled.
const tawkOn = isTawkConfigured();

export function TutorShell({
  tier,
  children,
}: {
  tier: SubscriptionTier;
  children: React.ReactNode;
}) {
  const open = useTutorStore((s) => s.open);
  const openPanel = useTutorStore((s) => s.openPanel);
  const closePanel = useTutorStore((s) => s.closePanel);
  const examActive = useExamActive();

  useEffect(() => {
    void useTutorStore.persist.rehydrate();
  }, []);

  // Never available mid-exam: close it if an exam starts while it is open.
  useEffect(() => {
    if (examActive) closePanel();
  }, [examActive, closePanel]);

  // Hide Tawk while Astra owns the corner (open panel or mid-exam).
  useEffect(() => {
    if (!tawkOn) return;
    syncTawkVisibility({ tutorOpen: open && !examActive, examActive });
  }, [open, examActive]);

  const visible = open && !examActive;

  return (
    <>
      {/* Wide screens: content makes room for the dock instead of sitting
          under it. Narrower desktops can't spare 400px beside the sidebar, so
          the panel overlays the page there (see DOCKED in tutor-panel). */}
      <div className={cn(visible && "min-[1440px]:pr-[400px]")}>{children}</div>

      {!visible && !examActive && (
        <button
          type="button"
          data-astra-trigger
          onClick={() => openPanel()}
          className={cn(
            "fixed right-4 z-30 flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg",
            tawkOn
              ? "bottom-[calc(10rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+4.5rem)]"
              : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6",
          )}
        >
          <LuStar className="h-4 w-4" aria-hidden />
          Ask Astra
        </button>
      )}

      {visible && <TutorPanel tier={tier} />}
    </>
  );
}
