import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
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


export async function getJambSubjectOptions(): Promise<{
  english: JambSubjectOption | null;
  subjects: JambSubjectOption[];
}> {
  const opts = await api<JambOptionsOut>(endpoints.assessments.jambCbt.options);

  const english = opts.english ? asOption(opts.english):null;

  const subjects = (opts.subjects ?? [])
    // backend-ported: English travels separately (when offered at all), so a
    // duplicate row must never surface as one of the three chosen subjects.
    .filter((s) => !(english && s.id === english.id))
    .map(asOption)
    .sort((a, b) => a.name.localeCompare(b.name));

  return { english, subjects };
}
