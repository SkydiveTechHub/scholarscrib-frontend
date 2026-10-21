"use client";

import { create } from "zustand";
import type { TutorContext } from "@/lib/tutor/types";

// Panel state shared by the layout (which mounts the panel) and the entry
// points scattered through pages. The server always renders the initial state
// -- nothing on the server may write to this store (see ./README.md).

export type TutorEntry = { context: TutorContext; label?: string };

type TutorStore = {
  open: boolean;
  /** Registered by the page being viewed (e.g. the lesson). */
  pageEntry: TutorEntry | null;
  /** "Explain this" on a specific item, or a detached (general) chat. */
  overrideEntry: TutorEntry | null;
  /** Session cache: contextKey → threadId so reopen resumes instead of creating. */
  threadIds: Record<string, string>;
  openPanel: (entry?: TutorEntry) => void;
  closePanel: () => void;
  detach: () => void;
  setPageEntry: (entry: TutorEntry | null) => void;
  rememberThread: (contextKey: string, threadId: string) => void;
  forgetThread: (contextKey: string) => void;
};

const GENERAL: TutorEntry = { context: { type: "general" } };

export const useTutorStore = create<TutorStore>()((set) => ({
  open: false,
  pageEntry: null,
  overrideEntry: null,
  threadIds: {},
  openPanel: (entry) => set({ open: true, overrideEntry: entry ?? null }),
  closePanel: () => set({ open: false, overrideEntry: null }),
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
}));

export function selectActiveEntry(
  s: Pick<TutorStore, "overrideEntry" | "pageEntry">,
): TutorEntry {
  return s.overrideEntry ?? s.pageEntry ?? GENERAL;
}
