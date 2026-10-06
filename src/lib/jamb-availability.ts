import { api } from "@/lib/api/server";
import type { JambOptionsOut, JambSubjectOut } from "@/lib/api/types";

// Which JAMB sittings can be assembled. The backend reads the question
// provider's catalogue: a subject is offered when the provider carries it for
// JAMB, and `years` lists the years it holds a full paper for (60 questions
// for English, 40 for every other subject).

export type JambSubjectOption = {
  id: string;
  code: string;
  name: string;
  /** The provider's subject key, used for track grouping. */
  providerKey: string;
  /** The provider's category: sciences, arts, commercial, ... */
  category: string;
  /** Years with a full paper, newest first. */
  years: number[];
};

function asOption(row: JambSubjectOut): JambSubjectOption {
  return {
    id: row.id,
    code: row.code ?? row.slug,
    name: row.name,
    providerKey: row.providerKey,
    category: row.category ?? "",
    years: (row.years ?? []).filter((y) => Number.isInteger(y)),
  };
}

/**
 * English (compulsory, never chosen) and the subjects offerable beside it.
 * `null` when the provider's catalogue could not be read.
 */
export async function getJambSubjectOptions(): Promise<{
  english: JambSubjectOption | null;
  subjects: JambSubjectOption[];
} | null> {
  try {
    const opts = await api<JambOptionsOut>("/api/assessments/jamb-cbt/options");
    const english = opts.english ? asOption(opts.english) : null;
    return {
      english,
      subjects: (opts.subjects ?? [])
        // English travels separately, so it can never be one of the three.
        .filter((s) => !english || s.id !== english.id)
        .map(asOption)
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  } catch (error) {
    console.error("Loading JAMB options failed:", error);
    return null;
  }
}

