"use client";

import { create } from "zustand";

// Whether a student is mid-exam, published to the app chrome.
//
// Global rather than context: the sidebar and the mobile nav are siblings of
// the exam in the dashboard layout, so a provider would have to wrap the whole
// layout to reach them. The server always renders the initial state — nothing
// on the server may write to this store (see ./README.md).

type ExamState = {
  active: boolean;
  /** Called by the exam surface as it mounts and unmounts. */
  setActive: (active: boolean) => void;
};

export const useExamStore = create<ExamState>()((set) => ({
  active: false,
  setActive: (active) => set({ active }),
}));

export const useExamActive = () => useExamStore((state) => state.active);
