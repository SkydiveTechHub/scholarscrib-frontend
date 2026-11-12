"use client";

import { useCallback, useEffect, useState } from "react";
import { LuArchive, LuPlus, LuSparkles } from "react-icons/lu";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { StatusBanner } from "@/components/admin/status-banner";
import { CenterAstraChat } from "@/components/center-app/center-astra-chat";
import { CenterTokenBalance } from "@/components/center-app/center-token-balance";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useQueryClient } from "@tanstack/react-query";
import {
  readTokenBalance,
  useCenterTokenBalance,
} from "@/hooks/api/use-center-tokens";
import {
  archiveCenterAstraThread,
  createCenterAstraThread,
  getCenterAstraThread,
  isThreadMissing,
  listCenterAstraThreads,
} from "@/lib/center-astra/api";
import type { AstraThread, AstraThreadSummary } from "@/lib/center-astra/types";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";

const OPEN_KEY = "center-astra-open";
const EMPTY = "Ask Astra about assignment-scoped performance for this center.";

function threadTitle(title: string | null): string {
  return title?.trim() || "New chat";
}

function openStorageKey(centerId: string) {
  return `${OPEN_KEY}:${centerId}`;
}

export function CenterAstraApp({
  centerId,
  canTopUp,
}: {
  centerId: string;
  canTopUp: boolean;
}) {
  const queryClient = useQueryClient();
  const tokensQuery = useCenterTokenBalance(centerId);
  const balance = readTokenBalance(tokensQuery.data);
  const tokensEmpty = typeof balance === "number" && balance <= 0;

  const [threads, setThreads] = useState<AstraThreadSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState<AstraThread | null>(null);
  const [pane, setPane] = useState<"list" | "chat">("list");
  const [listError, setListError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const refreshBalance = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.center.tokens(centerId),
    });
  }, [centerId, queryClient]);

  useEffect(() => {
    let cancelled = false;
    setThreads(null);
    setSelectedId(null);
    setOpen(null);
    setPane("list");
    setListError(null);
    listCenterAstraThreads(centerId)
      .then((rows) => {
        if (cancelled) return;
        setThreads(rows);
        const saved = window.sessionStorage.getItem(openStorageKey(centerId));
        if (saved && rows.some((row) => row.id === saved)) {
          setSelectedId(saved);
          setPane("chat");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setListError(
            error instanceof Error ? error.message : "Couldn't load chats.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [centerId]);

  useEffect(() => {
    if (!selectedId) return;
    window.sessionStorage.setItem(openStorageKey(centerId), selectedId);
    let cancelled = false;
    getCenterAstraThread(centerId, selectedId)
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
          window.sessionStorage.removeItem(openStorageKey(centerId));
          return;
        }
        setListError(
          error instanceof Error ? error.message : "Couldn't open that chat.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [centerId, selectedId]);

  const onTitle = useCallback(
    (title: string) => {
      setThreads(
        (prev) =>
          prev?.map((row) => (row.id === selectedId ? { ...row, title } : row)) ??
          prev,
      );
      setOpen((prev) =>
        prev && prev.id === selectedId ? { ...prev, title } : prev,
      );
    },
    [selectedId],
  );

  const onMissing = useCallback(() => {
    if (!selectedId) return;
    setThreads((prev) => prev?.filter((row) => row.id !== selectedId) ?? prev);
    setSelectedId(null);
    setOpen(null);
    setPane("list");
    window.sessionStorage.removeItem(openStorageKey(centerId));
  }, [centerId, selectedId]);

  async function createChat() {
    if (creating) return;
    setCreating(true);
    setListError(null);
    try {
      const thread = await createCenterAstraThread(centerId);
      setThreads((prev) => [
        thread,
        ...(prev ?? []).filter((row) => row.id !== thread.id),
      ]);
      setOpen(thread);
      setSelectedId(thread.id);
      setPane("chat");
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : "Couldn't start a chat.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function confirmArchive() {
    if (!archiveId) return;
    setArchiving(true);
    try {
      await archiveCenterAstraThread(centerId, archiveId);
      setThreads((prev) => prev?.filter((row) => row.id !== archiveId) ?? prev);
      if (selectedId === archiveId) {
        setSelectedId(null);
        setOpen(null);
        setPane("list");
        window.sessionStorage.removeItem(openStorageKey(centerId));
      }
      setArchiveId(null);
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : "Couldn't archive that chat.",
      );
      setArchiveId(null);
    } finally {
      setArchiving(false);
    }
  }

  const showChat = pane === "chat" && selectedId && open?.id === selectedId;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CenterTokenBalance centerId={centerId} canTopUp={canTopUp} />
      </div>

      <div
        className={cn(
          "flex min-h-0 overflow-hidden rounded-xl border border-border bg-card",
          "h-[calc(100dvh-12rem)] min-h-[24rem] lg:h-[calc(100dvh-8rem)]",
        )}
      >
        <aside
          className={cn(
            "min-h-0 w-full shrink-0 flex-col border-border lg:flex lg:w-64 lg:border-r",
            pane === "chat" ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <LuSparkles className="h-4 w-4 text-primary" aria-hidden />
              <h1 className="text-sm font-semibold text-foreground">Astra</h1>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void createChat()}
              disabled={creating || tokensEmpty}
            >
              <LuPlus className="h-3.5 w-3.5" aria-hidden />
              New
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {listError && (
              <div className="p-3">
                <StatusBanner tone="error" title={listError} />
              </div>
            )}
            {threads == null && !listError && (
              <div className="flex justify-center px-3 py-8">
                <Spinner />
              </div>
            )}
            {threads?.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted">{EMPTY}</p>
            )}
            <ul>
              {threads?.map((thread) => (
                <li
                  key={thread.id}
                  className="flex items-stretch border-b border-border"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(thread.id);
                      setPane("chat");
                    }}
                    className={cn(
                      "min-w-0 flex-1 px-3 py-2.5 text-left text-sm",
                      selectedId === thread.id
                        ? "bg-secondary text-foreground"
                        : "text-foreground hover:bg-secondary/60",
                    )}
                  >
                    <span className="block truncate font-semibold">
                      {threadTitle(thread.title)}
                    </span>
                    {thread.activeRun?.status === "running" && (
                      <span className="text-xs text-muted">Replying…</span>
                    )}
                    {thread.activeRun?.status === "paused" && (
                      <span className="text-xs text-muted">Needs approval</span>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Archive chat"
                    onClick={() => setArchiveId(thread.id)}
                    className="px-2 text-muted hover:bg-secondary hover:text-foreground"
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
            pane === "chat" ? "flex" : "hidden lg:flex",
          )}
        >
          {showChat && open ? (
            <CenterAstraChat
              key={open.id}
              centerId={centerId}
              threadId={open.id}
              title={open.title}
              messages={open.messages}
              activeRun={open.activeRun}
              tokensEmpty={tokensEmpty}
              canTopUp={canTopUp}
              onTitle={onTitle}
              onMissing={onMissing}
              onBack={() => setPane("list")}
              onTokensSpent={refreshBalance}
            />
          ) : selectedId ? (
            <p className="px-4 py-6 text-sm text-muted">Loading chat…</p>
          ) : (
            <div className="hidden flex-1 items-center justify-center px-6 text-center lg:flex">
              <p className="max-w-sm text-sm text-muted">
                {tokensEmpty
                  ? "Top up AI tokens to start a chat."
                  : "Select a chat or start a new one."}
              </p>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={archiveId != null}
        title="Archive this chat?"
        description="The conversation leaves your list. You can start a new one anytime."
        confirmLabel={archiving ? "Archiving…" : "Archive"}
        busy={archiving}
        onConfirm={() => void confirmArchive()}
        onCancel={() => {
          if (!archiving) setArchiveId(null);
        }}
      />
    </div>
  );
}
