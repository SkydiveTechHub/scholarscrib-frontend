"use client";

import { useState } from "react";
import { LuDownload } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { useExportQuestions } from "@/hooks/api/use-admin-questions";
import { exportErrorMessage, type ExportFormat } from "@/lib/admin-coverage";

/** CSV and JSON downloads for one paper, or (allYears) a zip of a whole subject. */
export function ExportButtons({
  subjectId,
  examType,
  examYear,
  allYears = false,
}: {
  subjectId: string;
  examType?: string;
  examYear?: number;
  allYears?: boolean;
}) {
  const exportQuestions = useExportQuestions();
  // Shown beside the buttons that failed, and cleared by the next attempt, so a
  // refusal is never left behind off-screen or after a later success.
  const [error, setError] = useState<string | null>(null);
  const busyFormat = exportQuestions.isPending ? exportQuestions.variables?.format : null;

  async function download(format: ExportFormat) {
    setError(null);
    try {
      await exportQuestions.mutateAsync({ subjectId, examType, examYear, format });
    } catch (failure) {
      setError(exportErrorMessage(failure));
    }
  }

  const formats: { format: ExportFormat; label: string }[] = [
    { format: "csv", label: allYears ? "All years · CSV (zip)" : "CSV" },
    { format: "json", label: allYears ? "All years · JSON (zip)" : "JSON" },
  ];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
      {formats.map(({ format, label }) => (
        <Button
          key={format}
          variant="outline"
          size="sm"
          onClick={() => void download(format)}
          disabled={exportQuestions.isPending}
          aria-label={`Download ${label}`}
        >
          <LuDownload className="mr-1.5 h-4 w-4" aria-hidden />
          {busyFormat === format ? "Preparing…" : label}
        </Button>
      ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-tone-red-ink">
          {error}
        </p>
      )}
    </div>
  );
}
