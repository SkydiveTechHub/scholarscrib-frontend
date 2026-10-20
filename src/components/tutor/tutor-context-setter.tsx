"use client";

import { useEffect } from "react";
import { useTutorStore, type TutorEntry } from "@/stores/tutor-store";

/** Rendered by a page to tell Astra what the student is looking at. */
export function TutorContextSetter({ entry }: { entry: TutorEntry }) {
  const setPageEntry = useTutorStore((s) => s.setPageEntry);
  const { context, label } = entry;
  const key = JSON.stringify(context);

  useEffect(() => {
    setPageEntry({ context: JSON.parse(key), label });
    return () => setPageEntry(null);
  }, [key, label, setPageEntry]);

  return null;
}
