"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { resolveTab, tabHref, type QuestionsTab } from "@/lib/admin-coverage";
import { cn } from "@/lib/utils";
import { AllQuestionsTab } from "./all-questions-tab";
import { BackfillTab } from "./backfill-tab";
import { CoverageTab } from "./coverage-tab";

const TABS: { id: QuestionsTab; label: string }[] = [
  { id: "coverage", label: "Coverage" },
  { id: "backfill", label: "Backfill" },
  { id: "all", label: "All questions" },
];

// `useSearchParams` requires a Suspense boundary around the Client Component
// that calls it, or a static build fails ("Missing Suspense boundary with
// useSearchParams"). See node_modules/next/dist/docs/01-app/03-api-reference/
// 04-functions/use-search-params.md.
export function QuestionsClient() {
  return (
    <Suspense fallback={<QuestionsPageFallback />}>
      <QuestionsShell />
    </Suspense>
  );
}

function QuestionsPageFallback() {
  return (
    <div>
      <PageHeader title="Questions" description="Loading…" />
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

function QuestionsShell() {
  const tab = resolveTab(useSearchParams());

  return (
    <div>
      <PageHeader
        title="Questions"
        description="What is populated for each subject and year, and the full question list."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/questions/import" className={buttonClass("secondary", "md")}>
              Import
            </Link>
            <Link href="/admin/questions/new" className={buttonClass("primary", "md")}>
              New question
            </Link>
          </div>
        }
      />

      <div
        role="tablist"
        aria-label="Questions views"
        className="mb-6 flex gap-1 border-b border-border-strong"
      >
        {TABS.map((item) => (
          <Link
            key={item.id}
            id={`questions-tab-${item.id}`}
            href={tabHref(item.id)}
            replace
            role="tab"
            aria-selected={tab === item.id}
            aria-controls="questions-tabpanel"
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              tab === item.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Only the active tab is mounted, so opening the list from a coverage
          chip starts it with that paper's filters read from the URL. */}
      <div id="questions-tabpanel" role="tabpanel" aria-labelledby={`questions-tab-${tab}`}>
        {tab === "coverage" ? (
          <CoverageTab />
        ) : tab === "backfill" ? (
          <BackfillTab />
        ) : (
          <AllQuestionsTab />
        )}
      </div>
    </div>
  );
}
