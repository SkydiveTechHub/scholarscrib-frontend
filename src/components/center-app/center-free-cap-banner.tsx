import Link from "next/link";
import { CENTER_FREE_ACTIVE_STUDENT_LIMIT } from "@/lib/center-subjects";
import { cn } from "@/lib/utils";

const BILLING_HREF = "/center/billing";

/** Soft nudge when a Free center is near or at the active-student cap. */
export function CenterFreeCapBanner({
  plan,
  activeCount,
  activeLimit,
  className,
}: {
  plan?: string | null;
  activeCount?: number | null;
  activeLimit?: number | null;
  className?: string;
}) {
  const isFree = !plan || plan.toUpperCase() === "FREE";
  if (!isFree) return null;

  const limit = activeLimit ?? CENTER_FREE_ACTIVE_STUDENT_LIMIT;
  const count = activeCount ?? 0;
  if (count < limit - 1) return null;

  const atCap = count >= limit;

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        atCap
          ? "border-tone-amber-line bg-tone-amber-soft text-tone-amber-ink"
          : "border-border bg-secondary text-foreground",
        className,
      )}
    >
      {atCap ? (
        <p>
          Free plan is full ({limit} active students).{" "}
          <Link
            href={BILLING_HREF}
            className="font-semibold underline underline-offset-2"
          >
            Upgrade to Pro or Team
          </Link>{" "}
          to invite more.
        </p>
      ) : (
        <p>
          {count} of {limit} Free seats used. One more student can join before
          you need a{" "}
          <Link
            href={BILLING_HREF}
            className="font-semibold underline underline-offset-2"
          >
            paid plan
          </Link>
          .
        </p>
      )}
    </div>
  );
}
