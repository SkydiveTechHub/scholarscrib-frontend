"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { LuStar } from "react-icons/lu";
import { useExamActive } from "@/stores/exam-store";
import { useTutorStore } from "@/stores/tutor-store";
import type { SubscriptionTier } from "@/lib/subscription";
import { cn } from "@/lib/utils";

// The panel, KaTeX and the chat code load on first open, not with the page:
// most students are on metered data and most page views never open Astra.
const TutorPanel = dynamic(() => import("./tutor-panel"), { ssr: false });

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

  // Never available mid-exam: close it if an exam starts while it is open.
  useEffect(() => {
    if (examActive) closePanel();
  }, [examActive, closePanel]);

  const visible = open && !examActive;

  return (
    <>
      {/* Desktop: content makes room for the dock instead of sitting under it. */}
      <div className={cn(visible && "lg:pr-[400px]")}>{children}</div>

      {!visible && !examActive && (
        <button
          type="button"
          data-astra-trigger
          onClick={() => openPanel()}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg lg:bottom-6"
        >
          <LuStar className="h-4 w-4" aria-hidden />
          Ask Astra
        </button>
      )}

      {visible && <TutorPanel tier={tier} />}
    </>
  );
}
