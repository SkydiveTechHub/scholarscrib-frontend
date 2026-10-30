"use client";

import Link from "next/link";
import {
  LuBookOpenText,
  LuExternalLink,
  LuFile,
  LuFileText,
  LuImage,
  LuLink,
  LuLock,
  LuVideo,
} from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { MATERIAL_LABELS, type MaterialType } from "@/lib/materials";
import { cn } from "@/lib/utils";

export type SubjectResource = {
  id: string;
  subjectId: string;
  title: string;
  description: string | null;
  resourceType: MaterialType;
  url: string;
  author: string | null;
  isFree: boolean;
  orderIndex: number;
  /** Set by the server when this resource needs a plan the viewer lacks. */
  locked?: boolean;
  /** Epoch seconds when a private file's link stops working; null for public ones. */
  expiresAt?: number | null;
};

// Keyed by the MaterialType members. Lesson resources use their own lowercase
// strings, so the lookup lowercases before matching and both kinds land on the
// same icon language.
const RESOURCE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pdf: LuFileText,
  image: LuImage,
  video: LuVideo,
  link: LuLink,
};

function ResourceIcon({ type }: { type: string }) {
  const Icon = RESOURCE_ICONS[type.toLowerCase()] ?? LuFile;
  return <Icon className="h-5 w-5" />;
}

export function isReadable(resource: SubjectResource) {
  // A locked resource arrives with its url stripped, so there is nothing to
  // open and nothing to read.
  if (resource.locked) return false;
  // Keyed off the type, not a `.pdf` suffix: a Cloudinary raw URL does not
  // necessarily end in `.pdf`, and the old suffix check refused to open one.
  return resource.resourceType === "PDF";
}

const CARD = "card card-interactive group flex items-start gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

/**
 * One resource on a subject shelf. Locked resources keep their place — they are
 * the reason to upgrade — but lead to billing and say so in words, not only in
 * a tooltip a phone never shows.
 */
export function ResourceCard({
  resource,
  onRead,
}: {
  resource: SubjectResource;
  onRead?: (resource: SubjectResource) => void;
}) {
  const readable = isReadable(resource);
  const locked = Boolean(resource.locked);

  const content = (
    <>
      <span
        className={cn(
          "mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl",
          locked ? "bg-secondary text-muted" : "bg-primary-soft text-primary",
        )}
      >
        {locked ? (
          <LuLock className="h-5 w-5" aria-hidden />
        ) : readable ? (
          <LuBookOpenText className="h-5 w-5" aria-hidden />
        ) : (
          <ResourceIcon type={resource.resourceType} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
            {resource.title}
          </h3>
          {locked ? (
            <Badge variant="amber" className="flex-shrink-0">
              <LuLock className="h-3 w-3" aria-hidden />
              Locked
            </Badge>
          ) : (
            !resource.isFree && (
              <Badge variant="amber" className="flex-shrink-0">
                Premium
              </Badge>
            )
          )}
        </div>
        {resource.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{resource.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Badge variant="neutral">
            {MATERIAL_LABELS[resource.resourceType] ?? resource.resourceType}
          </Badge>
          {resource.author && <span className="text-xs text-muted">by {resource.author}</span>}
          {/* Always visible: what the tap does should not wait for a hover. */}
          {locked ? (
            <span className="ml-auto text-xs font-bold text-tone-amber-ink">Upgrade to open</span>
          ) : readable ? (
            <span className="ml-auto flex items-center gap-1 text-xs font-bold text-primary">
              <LuBookOpenText className="h-3.5 w-3.5" aria-hidden />
              Read
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-muted group-hover:text-primary">
              Open
              <LuExternalLink className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </span>
          )}
        </div>
      </div>
    </>
  );

  if (locked) {
    return (
      <Link href="/settings/billing" className={CARD}>
        {content}
      </Link>
    );
  }

  if (readable && onRead) {
    return (
      <button type="button" onClick={() => onRead(resource)} className={cn(CARD, "text-left")}>
        {content}
      </button>
    );
  }

  return (
    <a href={resource.url} target="_blank" rel="noopener noreferrer" className={CARD}>
      {content}
    </a>
  );
}
