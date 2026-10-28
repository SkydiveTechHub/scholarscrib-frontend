"use client";

import { LuTrash2 } from "react-icons/lu";
import {
  useDeleteTutorThread,
  useTutorHistory,
} from "@/hooks/api/use-tutor";
import type { TutorThreadSummary } from "@/lib/tutor/types";
import { cn } from "@/lib/utils";

const SCOPE_LABEL: Record<TutorThreadSummary["scope"], string> = {
  lesson: "Lesson",
  question: "Practice question",
  topic: "Topic",
  general: "General",
};

function examLabel(t: TutorThreadSummary): string | null {
  if (t.scope !== "question" || !t.examType) return null;
  return t.examYear ? `${t.examType} ${t.examYear}` : t.examType;
}

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function TutorHistory({
  currentThreadId,
  resumingId,
  failed,
  onResume,
  onNew,
}: {
  currentThreadId: string | null;
  /** Thread being loaded right now, so its row can show progress. */
  resumingId: string | null;
  /** The last open/new attempt failed. */
  failed?: boolean;
  onResume: (threadId: string) => void;
  onNew: () => void;
}) {
  const history = useTutorHistory(true);
  const remove = useDeleteTutorThread();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onNew}
          className="min-h-11 w-full rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground"
        >
          New chat
        </button>
      </div>

      {failed && (
        <p
          role="alert"
          className="border-b border-danger/30 bg-danger-soft px-4 py-2 text-sm text-foreground"
        >
          Couldn&apos;t open that chat. Check your connection and try again.
        </p>
      )}

      <div className="flex-1 overflow-y-auto">
        {history.isPending ? (
          <p className="p-4 text-sm text-muted" role="status">
            Loading your chats…
          </p>
        ) : history.isError ? (
          <p className="p-4 text-sm text-foreground" role="alert">
            Couldn&apos;t load your chats.{" "}
            <button
              type="button"
              onClick={() => void history.refetch()}
              className="min-h-11 font-bold text-primary"
            >
              Try again
            </button>
          </p>
        ) : history.data.length === 0 ? (
          <p className="p-4 text-sm text-muted">
            No past chats yet. Ask Astra something and it will show up here.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {history.data.map((t) => {
              const current = t.threadId === currentThreadId;
              const loading = t.threadId === resumingId;
              return (
                <li key={t.threadId} className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => onResume(t.threadId)}
                    disabled={loading}
                    aria-current={current ? "true" : undefined}
                    className={cn(
                      "min-h-14 min-w-0 flex-1 px-4 py-2.5 text-left hover:bg-secondary",
                      current && "bg-primary-soft",
                    )}
                  >
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {t.title}
                    </span>
                    <span className="block text-xs text-muted">
                      {loading
                        ? "Opening…"
                        : [examLabel(t) ?? SCOPE_LABEL[t.scope], when(t.updatedAt)]
                            .filter(Boolean)
                            .join(" · ")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(t.threadId)}
                    disabled={remove.isPending}
                    aria-label={`Delete chat: ${t.title}`}
                    className="flex w-11 flex-shrink-0 items-center justify-center text-muted hover:bg-secondary hover:text-foreground"
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
