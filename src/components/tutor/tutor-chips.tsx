"use client";

import type { Chip } from "@/lib/tutor/chips";

export function TutorChips({
  chips,
  onPick,
  disabled,
}: {
  chips: Chip[];
  onPick: (chip: Chip) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          disabled={disabled}
          onClick={() => onPick(chip)}
          className="min-h-11 rounded-full border border-border bg-card px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft disabled:opacity-50"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
