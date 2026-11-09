import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import type { JambOptionsOut, JambSubjectOut } from "@/lib/api/types";

// Which JAMB subjects can be offered. The backend intersects our JAMB subjects
// with what the active question provider carries. Years are not part of this
// list: they load per chosen subject through the catalogue years endpoint, so
// opening the sitting builder never fans out to the provider for every subject.

export type JambSubjectOption = {
  id: string;
  code: string;
  name: string;
  /** The key the provider is asked by (our slug), also used for track grouping. */
  providerKey: string;
  /** Our track category: CORE, SCIENCE, ARTS, COMMERCIAL or VOCATIONAL. */
  category: string;
};

function asOption(row: JambSubjectOut): JambSubjectOption {
  return {
    id: row.id,
    code: row.code ?? row.slug,
    name: row.name,
    providerKey: row.providerKey,
    category: row.category ?? "",
  };
}

export async function getJambSubjectOptions(): Promise<{
  english: JambSubjectOption | null;
  subjects: JambSubjectOption[];
}> {
  const opts = await api<JambOptionsOut>(endpoints.assessments.jambCbt.options);

  const english = opts.english ? asOption(opts.english) : null;

  const subjects = (opts.subjects ?? [])
    // English travels separately (when offered at all), so a duplicate row must
    // never surface as one of the three chosen subjects.
    .filter((s) => !(english && s.id === english.id))
    .map(asOption)
    .sort((a, b) => a.name.localeCompare(b.name));

  return { english, subjects };
}
