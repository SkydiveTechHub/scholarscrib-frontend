import { api } from "@/lib/api/server";
import type { JambOptionsOut, MockOptionSubject } from "@/lib/api/types";

// Which JAMB papers the backend can assemble. The FastAPI backend owns the
// question bank and the coverage math, so this module only maps its options
// payload onto the picker's shape.

export type JambSubjectOption = {
  id: string;
  code: string;
  name: string;
  /** Years where this subject alone has enough questions. */
  eligibleYears: number[];
};

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
}

function asSubjectOption(row: MockOptionSubject): JambSubjectOption {
  return {
    id: String(row.id ?? ""),
    code: String(row.code ?? row.slug ?? ""),
    name: String(row.name ?? ""),
    // backend-ported: the options payload does not always report per-subject
    // eligibility (the picker treats an empty list as "load on demand").
    eligibleYears: asNumberArray(row.eligibleYears ?? []),
  };
}

/**
 * The subjects offerable in the picker, each with the years it can cover.
 *
 * English is excluded — it is added by the system, not chosen — but its own
 * coverage is what usually decides whether any year is sittable at all.
 */
export async function getJambSubjectOptions(): Promise<{
  english: { id: string; code: string; name: string } | null;
  englishYears: number[];
  subjects: JambSubjectOption[];
}> {
  const opts = await api<JambOptionsOut>("/api/assessments/jamb-cbt/options");

  const englishRaw = opts.english;
  const english =
    englishRaw && typeof englishRaw === "object"
      ? {
          id: String(englishRaw.id ?? englishRaw.code ?? ""),
          code: String(englishRaw.code ?? ""),
          name: String(englishRaw.name ?? ""),
        }
      : null;

  const subjects = (opts.subjects ?? [])
    // backend-ported: English travels separately (when offered at all), so a
    // duplicate row must never surface as one of the three chosen subjects.
    .filter((s) => !(english && s.id === english.id))
    .map(asSubjectOption)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    english,
    englishYears: asNumberArray(opts.englishYears),
    subjects,
  };
}