"use client";

import { useMemo } from "react";
import { useCoverageOverview, useQuestionCoverage } from "@/hooks/api/use-admin-questions";
import { paperKey } from "@/lib/admin-coverage";
import { CoverageBoard } from "./coverage-board";

export function BackfillTab() {
  const coverage = useQuestionCoverage();
  const overview = useCoverageOverview();

  // Papers present in the Coverage table too. Until that loads (or if it
  // fails) nothing is marked, rather than blocking the Backfill board.
  const inCoverage = useMemo(() => {
    const keys = new Set<string>();
    for (const subject of overview.data?.subjects ?? []) {
      for (const paper of subject.papers) {
        keys.add(paperKey(subject.subjectId, paper.examType, paper.examYear));
      }
    }
    return keys;
  }, [overview.data]);

  return (
    <CoverageBoard
      coverage={coverage}
      source="bank"
      emptyMessage="No past-paper questions have been populated yet."
      showExport
      inCoverage={inCoverage}
    />
  );
}
