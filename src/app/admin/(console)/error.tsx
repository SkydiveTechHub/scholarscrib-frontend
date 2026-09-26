"use client";

import { AdminErrorState } from "@/components/admin/admin-error-state";

/**
 * Catches a failed backend read in any console page. Sits inside the console
 * layout, so the sidebar stays up and the admin can move to another page.
 */
export default function ConsoleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <AdminErrorState
      error={error}
      onRetry={unstable_retry}
      homeHref="/admin"
      homeLabel="Back to overview"
    />
  );
}
