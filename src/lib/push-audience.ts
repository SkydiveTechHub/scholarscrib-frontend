// Who an announcement is for: the composer's filter shape and its label. The
// backend resolves the filter to recipients.

import { z } from "zod";

export const audienceFilterSchema = z
  .object({
    examTargets: z.array(z.enum(["WAEC", "JAMB", "NECO"])).max(3).optional(),
    classLevels: z.array(z.enum(["SS1", "SS2", "SS3"])).max(3).optional(),
    tracks: z.array(z.enum(["SCIENCE", "ARTS", "COMMERCIAL"])).max(3).optional(),
    tiers: z.array(z.enum(["FREEMIUM", "STANDARD", "PREMIUM"])).max(3).optional(),
    userIds: z.array(z.string().min(1).max(64)).max(1000).optional(),
  })
  .strict();

export type AudienceFilter = z.infer<typeof audienceFilterSchema>;

export function parseStoredAudience(json: unknown): AudienceFilter | null {
  const parsed = audienceFilterSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

export function describeAudience(filter: AudienceFilter): string {
  const parts: string[] = [];
  if (filter.userIds?.length) {
    parts.push(filter.userIds.length === 1 ? "1 specific student" : `${filter.userIds.length} specific students`);
  }
  if (filter.examTargets?.length) parts.push(`${filter.examTargets.join("/")} plan`);
  if (filter.classLevels?.length) parts.push(filter.classLevels.join("/"));
  if (filter.tracks?.length) parts.push(filter.tracks.map((t) => t[0] + t.slice(1).toLowerCase()).join("/"));
  if (filter.tiers?.length) parts.push(filter.tiers.map((t) => t[0] + t.slice(1).toLowerCase()).join("/"));
  return parts.length ? parts.join(" · ") : "All students";
}
