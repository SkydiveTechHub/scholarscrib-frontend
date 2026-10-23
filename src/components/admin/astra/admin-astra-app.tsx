"use client";

import { useCallback, useEffect, useState } from "react";
import { LuArchive, LuPlus, LuSparkles, LuX } from "react-icons/lu";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { StatusBanner } from "@/components/admin/status-banner";
import { AdminAstraChat } from "@/components/admin/astra/admin-astra-chat";
import { Button } from "@/components/ui/button";
import {
  archiveAdminAstraThread,
  createAdminAstraThread,
  getAdminAstraThread,
  isThreadMissing,
  listAdminAstraThreads,
} from "@/lib/admin-astra/api";
import type { AstraThread, AstraThreadSummary } from "@/lib/admin-astra/types";
import { cn } from "@/lib/utils";

const OPEN_KEY = "admin-astra-open";
const EMPTY = "Ask Astra to look up a student, a question, or the dashboard.";

function threadTitle(title: string | null): string {
  return title?.trim() || "New chat";
}

export function AdminAstraApp({
  isOwner,
  fill = false,
  onClose,
}: {
  isOwner: boolean;
  /** Fill a floating panel instead of the console page column. */
  fill?: boolean;
  onClose?: () => void;
}) {
  const [threads, setThreads] = useState<AstraThreadSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState<AstraThread | null>(null);
  const [pane, setPane] = useState<"list" | "chat">("list");
  const [listError, setListError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listAdminAstraThreads()
      .then((rows) => {
        if (cancelled) return;
        setThreads(rows);
        const saved = window.sessionStorage.getItem(OPEN_KEY);
        if (saved && rows.some((row) => row.id === saved)) {
          setSelectedId(saved);
          setPane("chat");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setListError(error instanceof Error ? error.message : "Couldn't load chats.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    window.sessionStorage.setItem(OPEN_KEY, selectedId);
    let cancelled = false;
    getAdminAstraThread(selectedId)
      .then((thread) => {
        if (!cancelled) setOpen(thread);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isThreadMissing(error)) {
          setThreads((prev) => prev?.filter((row) => row.id !== selectedId) ?? prev);
          setSelectedId(null);
          setOpen(null);
          setPane("list");
          window.sessionStorage.removeItem(OPEN_KEY);
          return;
        }
        setListError(error instanceof Error ? error.message : "Couldn't open that chat.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const onTitle = useCallback((title: string) => {
    setThreads((prev) =>
      prev?.map((row) => (row.id === selectedId ? { ...row, title } : row)) ?? prev,
    );
    setOpen((prev) => (prev && prev.id === selectedId ? { ...prev, title } : prev));
  }, [selectedId]);

  const onMissing = useCallback(() => {
    if (!selectedId) return;
    setThreads((prev) => prev?.filter((row) => row.id !== selectedId) ?? prev);
    setSelectedId(null);
    setOpen(null);
    setPane("list");
    window.sessionStorage.removeItem(OPEN_KEY);
  }, [selectedId]);

  async function createChat() {
    if (creating) return;
    setCreating(true);
    setListError(null);
    try {
      const thread = await createAdminAstraThread();
      setThreads((prev) => [thread, ...(prev ?? []).filter((row) => row.id !== thread.id)]);
      setOpen(thread);
      setSelectedId(thread.id);
      setPane("chat");
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Couldn't start a chat.");
    } finally {
      setCreating(false);
    }
  }

  async function confirmArchive() {
    if (!archiveId) return;
    setArchiving(true);
    try {
      await archiveAdminAstraThread(archiveId);
      setThreads((prev) => prev?.filter((row) => row.id !== archiveId) ?? prev);
      if (selectedId === archiveId) {
        setSelectedId(null);
        setOpen(null);
        setPane("list");
        window.sessionStorage.removeItem(OPEN_KEY);
      }
      setArchiveId(null);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Couldn't archive that chat.");
      setArchiveId(null);
    } finally {
      setArchiving(false);
    }
  }

  const showChat = pane === "chat" && selectedId && open?.id === selectedId;

  return (
    <div
      className={cn(
        "flex min-h-0 overflow-hidden bg-card",
        fill
          ? "min-h-0 flex-1"
          : "h-[calc(100dvh-9.25rem)] min-h-[24rem] rounded-xl border border-border lg:h-[calc(100dvh-4rem)]",
      )}
    >
      <aside
        className={cn(
          "min-h-0 w-full shrink-0 flex-col border-border",
          !fill && "lg:flex lg:w-64 lg:border-r",
          pane === "chat" ? "hidden" : "flex",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <LuSparkles className="h-4 w-4 text-primary" aria-hidden />
            <h1 className="text-sm font-semibold text-foreground">Astra</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => void createChat()} disabled={creating}>
              <LuPlus className="h-3.5 w-3.5" aria-hidden />
              New
            </Button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Astra"
                className="rounded-lg p-1.5 text-muted hover:bg-secondary"
              >
                <LuX className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {listError && (
            <div className="p-3">
              <StatusBanner tone="error" title={listError} />
            </div>
          )}
          {threads == null && !listError && (
            <p className="px-3 py-4 text-sm text-muted">Loading chats…</p>
          )}
          {threads?.length === 0 && <p className="px-3 py-4 text-sm text-muted">{EMPTY}</p>}
          <ul>
            {threads?.map((thread) => (
              <li key={thread.id} className="flex items-stretch border-b border-border">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(thread.id);
                    setPane("chat");
                  }}
                  className={cn(
                    "min-w-0 flex-1 px-3 py-2.5 text-left text-sm",
                    thread.id === selectedId ? "bg-secondary text-foreground" : "text-foreground hover:bg-secondary/60",
                  )}
                >
                  <span className="block truncate">{threadTitle(thread.title)}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Archive ${threadTitle(thread.title)}`}
                  onClick={() => setArchiveId(thread.id)}
                  className="px-3 text-muted hover:text-foreground"
                >
                  <LuArchive className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section
        className={cn(
          "min-h-0 min-w-0 flex-1 flex-col",
          pane === "chat" ? "flex" : fill ? "hidden" : "hidden lg:flex",
        )}
      >
        {showChat && open ? (
          <AdminAstraChat
            key={open.id}
            threadId={open.id}
            title={open.title}
            messages={open.messages}
            activeRun={open.activeRun}
            isOwner={isOwner}
            onTitle={onTitle}
            onMissing={onMissing}
            onBack={() => setPane("list")}
            compact={fill}
            onClose={onClose}
          />
        ) : selectedId ? (
          <p className="px-4 py-6 text-sm text-muted">Loading chat…</p>
        ) : (
          <div className="hidden flex-1 items-center justify-center px-6 text-center lg:flex">
            <p className="max-w-sm text-sm text-muted">{EMPTY}</p>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={archiveId != null}
        title="Archive this chat?"
        description="It leaves your list. The audit log is unchanged."
        confirmLabel="Archive"
        busy={archiving}
        onConfirm={() => void confirmArchive()}
        onCancel={() => {
          if (!archiving) setArchiveId(null);
        }}
      />
    </div>
  );
}
