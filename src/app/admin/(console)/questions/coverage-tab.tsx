"use client";

import { useId, useRef, useState } from "react";
import { StatusBanner } from "@/components/admin/status-banner";
import { Button } from "@/components/ui/button";
import { useCoverageOverview, useImportCoverageQuestions } from "@/hooks/api/use-admin-questions";
import { cn } from "@/lib/utils";
import { CoverageBoard } from "./coverage-board";

type ImportOutcome =
  | { ok: true; message: string; errors: Array<{ index: number; reason: string }> }
  | { ok: false; message: string };

const FIELD_CLS =
  "w-full min-w-0 px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

/** Reads a file or pasted text as either an array of rows or `{ questions: [...] }`. */
function parseRows(raw: string): { rows: unknown[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "That is not valid JSON. Check for a trailing comma or a missing bracket." };
  }
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { questions?: unknown }).questions)
      ? (parsed as { questions: unknown[] }).questions
      : null;
  if (!rows) {
    return { error: 'Expected an array of questions or an object shaped { "questions": [ ... ] }.' };
  }
  if (rows.length === 0) return { error: "The file contains no questions." };
  if (rows.length > 500) {
    return { error: `${rows.length} rows exceeds the 500-row limit. Split the file into batches.` };
  }
  return { rows };
}

function ImportPanel({ onClose }: { onClose: () => void }) {
  const importQuestions = useImportCoverageQuestions();
  const [raw, setRaw] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const fileId = useId();
  const textId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setRaw(await file.text());
      setError(null);
    } catch {
      setError("Could not read that file. Choose a JSON file and try again.");
    }
  }

  async function handleImport() {
    const parsed = parseRows(raw);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setOutcome(null);
    try {
      const data = await importQuestions.mutateAsync({ questions: parsed.rows, skipDuplicates });
      setOutcome({
        ok: true,
        message: data.message,
        errors: (data.errors ?? []) as Array<{ index: number; reason: string }>,
      });
      if (data.imported > 0) {
        setRaw("");
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch (e) {
      setOutcome({
        ok: false,
        message: e instanceof Error ? e.message : "Could not reach the server. Nothing was imported.",
      });
    }
  }

  return (
    <div className="mb-6 space-y-4 rounded-lg border border-border-strong bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Import coverage questions</p>
          <p className="mt-1 text-sm text-muted">
            A JSON array of questions, or <code>{`{ "questions": [ ... ] }`}</code>, up to 500 per
            batch. Each row needs <code>subjectCode</code>, <code>examType</code>,{" "}
            <code>questionText</code>, <code>correctAnswer</code> and <code>explanation</code>.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {error && <StatusBanner tone="error" title="Cannot import" message={error} />}

      <div>
        <label htmlFor={fileId} className="block text-sm font-semibold text-foreground">
          Upload a JSON file
        </label>
        <input
          ref={fileRef}
          id={fileId}
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
          className="mt-1 block text-sm text-muted"
        />
      </div>

      <div>
        <label htmlFor={textId} className="block text-sm font-semibold text-foreground">
          Or paste JSON
        </label>
        <textarea
          id={textId}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={8}
          spellCheck={false}
          className={cn(FIELD_CLS, "mt-1 font-mono text-xs")}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={skipDuplicates}
          onChange={(e) => setSkipDuplicates(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        Skip questions already in this table
      </label>

      <Button onClick={handleImport} disabled={!raw.trim() || importQuestions.isPending}>
        {importQuestions.isPending ? "Importing…" : "Import"}
      </Button>

      {outcome && (
        <div>
          <StatusBanner
            tone={outcome.ok ? (outcome.errors.length ? "info" : "success") : "error"}
            title={outcome.ok ? "Import finished" : "Import failed"}
            message={outcome.message}
          />
          {outcome.ok && outcome.errors.length > 0 && (
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm text-muted">
              {outcome.errors.map((err) => (
                <li key={`${err.index}-${err.reason}`}>
                  Row <span className="tabular-nums">{err.index + 1}</span>: {err.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function CoverageTab({
  importOpen,
  onImportClose,
}: {
  importOpen: boolean;
  onImportClose: () => void;
}) {
  const coverage = useCoverageOverview();
  return (
    <div>
      {importOpen && <ImportPanel onClose={onImportClose} />}
      <CoverageBoard
        coverage={coverage}
        source="coverage"
        emptyMessage="No coverage questions yet. Use Import to add some."
        showExport={false}
      />
    </div>
  );
}
