"use client";

import { LuDownload } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { useExportQuestions } from "@/hooks/api/use-admin-questions";
import type { ExportFormat } from "@/lib/admin-coverage";

/** CSV and JSON downloads for one paper, or (allYears) a zip of a whole subject. */
export function ExportButtons({
  subjectId,
  examType,
  examYear,
  allYears = false,
  onError,
}: {
  subjectId: string;
  examType?: string;
  examYear?: number;
  allYears?: boolean;
  onError: (message: string) => void;
}) {
  const exportQuestions = useExportQuestions();
  const busyFormat = exportQuestions.isPending ? exportQuestions.variables?.format : null;

  async function download(format: ExportFormat) {
    try {
      await exportQuestions.mutateAsync({ subjectId, examType, examYear, format });
    } catch (error) {
      // The backend's message ("No questions to export", "Too many questions…")
      // is more useful than a generic failure.
      onError(
        error instanceof Error && error.message
          ? error.message
          : "Could not reach the server. Nothing was downloaded.",
      );
    }
  }

  const formats: { format: ExportFormat; label: string }[] = [
    { format: "csv", label: allYears ? "All years · CSV (zip)" : "CSV" },
    { format: "json", label: allYears ? "All years · JSON (zip)" : "JSON" },
  ];

  return (
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
  );
}
