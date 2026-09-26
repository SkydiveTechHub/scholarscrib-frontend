"use client";

import { AdminErrorState } from "@/components/admin/admin-error-state";

/**
 * A segment's error.tsx does not wrap its own layout, and (console)/layout.tsx
 * re-reads the admin session from the backend. This catches that layout
 * failing — without it an unreachable backend falls through to global-error.
 */
export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="px-4">
      <AdminErrorState
        error={error}
        onRetry={unstable_retry}
        homeHref="/admin/login"
        homeLabel="Admin sign-in"
      />
    </main>
  );
}
