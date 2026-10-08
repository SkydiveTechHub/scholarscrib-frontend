"use client";

import Link from "next/link";
import { LuLock } from "react-icons/lu";
import { buttonClass } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TIER_DISPLAY_NAMES, type SubscriptionTier } from "@/lib/subscription";

/**
 * The modal counterpart of `UpgradePrompt`, for a gate that is only discovered
 * when an action is attempted (the API answers 403 with the tier it needs).
 */
export function UpgradeModal({
  open,
  onClose,
  feature,
  requiredTier,
  description,
}: {
  open: boolean;
  onClose: () => void;
  /** Human-readable feature name, e.g. "Flashcards". */
  feature: string;
  requiredTier: SubscriptionTier;
  description?: string;
}) {
  const plan = TIER_DISPLAY_NAMES[requiredTier];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${feature} is part of ${plan}`}
      className="max-w-md"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={buttonClass("ghost", "md")}
          >
            Not now
          </button>
          <Link href="/settings/billing" className={buttonClass("primary", "md")}>
            Upgrade to {plan}
          </Link>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
          aria-hidden
        >
          <LuLock className="h-5 w-5" />
        </span>
        <p className="text-sm leading-relaxed text-muted">
          {description ??
            `Upgrade to ${plan} to unlock ${feature.toLowerCase()}.`}
        </p>
      </div>
    </Modal>
  );
}
