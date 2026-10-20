import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { AstraAvatar } from "./astra-avatar";

/** What a free-tier student sees: one canned reply, no model cost, then the upgrade. */
export function TutorLocked() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
          Why do plants need sunlight?
        </p>
      </div>
      <div className="flex items-start gap-2.5">
        <AstraAvatar />
        <p className="max-w-[85%] rounded-2xl rounded-tl-md bg-secondary px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
          Plants use sunlight to make their own food, a process called{" "}
          <strong className="font-semibold">photosynthesis</strong>. Light is
          the energy that turns water and carbon dioxide into glucose.
        </p>
      </div>
      <UpgradePrompt
        feature="Astra"
        requiredTier="PREMIUM"
        description="Ask Astra to explain any lesson or question, step by step, whenever you're stuck."
      />
    </div>
  );
}
