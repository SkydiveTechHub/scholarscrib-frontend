"use client";

import { useEffect } from "react";
import { LuTriangleAlert, LuRotateCcw } from "react-icons/lu";
import { Button, buttonClass } from "@/components/ui/button";

/**
 * Fallback body shared by the admin error boundaries. Server errors reach the
 * client with a generic message in production, so this can't tell a cold
 * backend from a bug — it offers a retry and the digest to match in the logs.
 */
export function AdminErrorState({
  error,
  onRetry,
  homeHref,
  homeLabel,
}: {
  error: Error & { digest?: string };
  onRetry: () => void;
  homeHref: string;
  homeLabel: string;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-20 text-center animate-fade-in">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-soft text-warning">
        <LuTriangleAlert className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-bold text-foreground">
        Couldn&apos;t load this page
      </h2>
      <p className="mt-1 text-sm text-muted">
        The server didn&apos;t answer or returned an error. Nothing was changed —
        try again, and if the backend was asleep give it a minute.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-muted">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={onRetry}>
          <LuRotateCcw className="h-4 w-4" />
          Try again
        </Button>
        {/* A full navigation rather than next/link: the failure may be in the
            layout the client router would keep. */}
        <a href={homeHref} className={buttonClass("outline")}>
          {homeLabel}
        </a>
      </div>
    </div>
  );
}
