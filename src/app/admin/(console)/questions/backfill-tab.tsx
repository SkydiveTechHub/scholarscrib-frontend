"use client";

import { useQuestionCoverage } from "@/hooks/api/use-admin-questions";
import { CoverageBoard } from "./coverage-board";

export function BackfillTab() {
  const coverage = useQuestionCoverage();
  return (
    <CoverageBoard
      coverage={coverage}
      source="bank"
      emptyMessage="No past-paper questions have been populated yet."
      showExport
    />
  );
}
