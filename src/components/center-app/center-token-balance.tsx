"use client";

import Link from "next/link";
import { LuCoins } from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import {
  readTokenBalance,
  useCenterTokenBalance,
} from "@/hooks/api/use-center-tokens";
import { cn } from "@/lib/utils";

export function CenterTokenBalance({
  centerId,
  canTopUp,
  compact = false,
  className,
}: {
  centerId: string | null | undefined;
  canTopUp?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const query = useCenterTokenBalance(centerId);
  const balance = readTokenBalance(query.data);
  const perTurn = query.data?.pool?.tokensPerTurn ?? 1;
  const lowAt = Math.max(perTurn * 5, 10);
  const empty = typeof balance === "number" && balance <= 0;
  const low = typeof balance === "number" && balance > 0 && balance <= lowAt;

  if (!centerId) return null;

  if (query.isLoading) {
    return (
      <p className={cn("text-sm text-muted", className)}>Loading tokens…</p>
    );
  }

  if (query.isError) {
    return (
      <p className={cn("text-sm text-muted", className)}>
        Could not load token balance.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        compact ? "text-xs" : "text-sm",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
        <LuCoins className="h-4 w-4 text-primary" aria-hidden />
        {typeof balance === "number" ? balance.toLocaleString() : "—"} tokens
      </span>
      {empty && <Badge variant="amber">Empty</Badge>}
      {low && !empty && <Badge variant="amber">Low</Badge>}
      {canTopUp && (
        <Link
          href="/center/billing#ai-tokens"
          className="font-semibold text-primary underline underline-offset-2"
        >
          Top up
        </Link>
      )}
    </div>
  );
}
