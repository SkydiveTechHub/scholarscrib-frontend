"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { TutorAction, TutorContext } from "@/lib/tutor/types";

// Panel state shared by the layout (which mounts the panel) and the entry
// points scattered through pages. The server always renders the initial state
// -- nothing on the server may write to this store (see ./README.md).

export type TutorEntry = { context: TutorContext; label?: string };
export type TutorAutoSend = { text: string; action: TutorAction | null };
export type TutorAutoSend = { text: string; action: TutorAction | null };

type TutorStore = {
  open: boolean;
  /** Registered by the page being viewed (e.g. the lesson). */
  pageEntry: TutorEntry | null;
  /** "Explain this" on a specific item, or a detached (general) chat. */
  overrideEntry: TutorEntry | null;
  /** Tab-session cache: contextKey → threadId so reopen resumes the chat. */
  threadIds: Record<string, string>;
  /** A question to send as soon as the opened conversation is ready. Not persisted. */
  autoSend: TutorAutoSend | null;
  openPanel: (entry?: TutorEntry, autoSend?: TutorAutoSend) => void;
  closePanel: () => void;
  clearAutoSend: () => void;
  detach: () => void;
  setPageEntry: (entry: TutorEntry | null) => void;
  rememberThread: (contextKey: string, threadId: string) => void;
  forgetThread: (contextKey: string) => void;
};

const GENERAL: TutorEntry = { context: { type: "general" } };

// The open conversation and its thread survive closing the panel and reloading
// the tab (sessionStorage), so coming back to Astra resumes where the student
// left off. Rehydrated from TutorShell's mount effect (see ./README.md).
export const useTutorStore = create<TutorStore>()(
  persist(
    (set) => ({
      open: false,
      pageEntry: null,
      overrideEntry: null,
      threadIds: {},
      // Opening without a specific item keeps whatever conversation was open.
      autoSend: null,
      openPanel: (entry, autoSend) =>
        set({
          open: true,
          autoSend: autoSend ?? null,
          ...(entry ? { overrideEntry: entry } : {}),
        }),
      closePanel: () => set({ open: false, autoSend: null }),
      clearAutoSend: () => set({ autoSend: null }),
      detach: () => set({ overrideEntry: GENERAL }),
      setPageEntry: (entry) => set({ pageEntry: entry }),
      rememberThread: (contextKey, threadId) =>
        set((s) => ({
          threadIds: { ...s.threadIds, [contextKey]: threadId },
        })),
      forgetThread: (contextKey) =>
        set((s) => {
          const next = { ...s.threadIds };
          delete next[contextKey];
          return { threadIds: next };
        }),
    }),
    {
      name: "astra-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        overrideEntry: s.overrideEntry,
        threadIds: s.threadIds,
      }),
      skipHydration: true,
    },
  ),
);

export function selectActiveEntry(
  s: Pick<TutorStore, "overrideEntry" | "pageEntry">,
): TutorEntry {
  return s.overrideEntry ?? s.pageEntry ?? GENERAL;
}
