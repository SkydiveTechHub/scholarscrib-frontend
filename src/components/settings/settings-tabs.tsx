"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SettingsTab = {
  id: string;
  label: string;
  panel: React.ReactNode;
};

/**
 * Groups the settings cards so a visit is one short screen, not one long
 * scroll. Every panel stays mounted (the inactive ones are only `hidden`), so
 * an edit half-typed in one tab survives a look at the other.
 */
export function SettingsTabs({
  tabs,
  initial,
}: {
  tabs: SettingsTab[];
  initial: string;
}) {
  const baseId = useId();
  const [active, setActive] = useState(
    tabs.some((tab) => tab.id === initial) ? initial : tabs[0].id,
  );
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});

  function select(id: string, focus = false) {
    setActive(id);
    if (focus) buttons.current[id]?.focus();
    // Keep the tab in the URL so a refresh or a shared link lands on it.
    try {
      const url = new URL(window.location.href);
      if (id === tabs[0].id) url.searchParams.delete("tab");
      else url.searchParams.set("tab", id);
      window.history.replaceState(null, "", url);
    } catch {
      // The URL is a convenience; the tab still switches without it.
    }
  }

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const last = tabs.length - 1;
    const target =
      event.key === "ArrowRight"
        ? index === last ? 0 : index + 1
        : event.key === "ArrowLeft"
          ? index === 0 ? last : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    select(tabs[target].id, true);
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Settings sections"
        className="mb-5 flex gap-1 border-b border-border"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                buttons.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "-mb-px h-11 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-inset rounded-t-lg",
                selected
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== active}
          className="space-y-5"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
