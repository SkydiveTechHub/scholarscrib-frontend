"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  tutorFilterParams,
  type TutorFilter,
} from "@/lib/admin-centers-filter";

const STATUS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const SELECT_CLS =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

export function TutorFilterBar({ filter }: { filter: TutorFilter }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(filter.search);
  const [status, setStatus] = useState(filter.status);

  function apply(next: Partial<TutorFilter> = {}) {
    const merged: TutorFilter = {
      search: next.search ?? search,
      status: next.status ?? status,
      page: 1,
    };
    const qs = new URLSearchParams(tutorFilterParams(merged)).toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <form
      className="mb-4 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <label className="min-w-[12rem] flex-1">
        <span className="sr-only">Search tutors</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        />
      </label>
      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          apply({ status: e.target.value });
        }}
        className={SELECT_CLS}
        aria-label="Status"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value || "any"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Filtering…" : "Filter"}
      </Button>
    </form>
  );
}
