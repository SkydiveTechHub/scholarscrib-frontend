"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { LuCheck, LuCrown, LuSparkles, LuZap } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { useBillingPlans } from "@/hooks/api/use-billing";
import { amountLabel, type PricingCardPlan } from "@/lib/billing-plans";
import type { SubscriptionTier } from "@/lib/subscription";
import { SectionHeader } from "./section";
import { Reveal } from "./reveal";

type PricingSurface = "landing" | "pricing_page";

const TIER_ICONS: Record<
  SubscriptionTier,
  typeof LuSparkles | typeof LuZap | typeof LuCrown
> = {
  FREEMIUM: LuSparkles,
  STANDARD: LuZap,
  PREMIUM: LuCrown,
};

function pricingSubtitle(plans: PricingCardPlan[]): string {
  const paid = plans.filter((p) => p.isPurchasable && p.amountKobo > 0);
  if (paid.length === 0) {
    return "New accounts get Standard for the first month. After that you stay on Free unless you upgrade.";
  }
  const prices = paid
    .map((p) => `${p.name} ${amountLabel(p.amountKobo)}`)
    .join(" or ");
  return `New accounts get Standard for the first month. After that you stay on Free unless you upgrade — monthly ${prices}.`;
}

export function PricingPlans({ surface = "landing" }: { surface?: PricingSurface }) {
  const { plans } = useBillingPlans();

  useEffect(() => {
    try {
      const posthog = (
        window as unknown as { posthog?: { capture?: (e: string, p?: object) => void } }
      ).posthog;
      posthog?.capture?.("billing_page_viewed", { surface });
    } catch {
      /* analytics optional */
    }
  }, [surface]);

  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
      {plans.map((plan, i) => {
        const Icon = TIER_ICONS[plan.tier] ?? LuSparkles;
        const isFree = plan.amountKobo <= 0 || !plan.isPurchasable;
        return (
          <Reveal key={plan.code} delay={i * 100} className="h-full">
            <div
              className={cn(
                "relative flex h-full flex-col rounded-3xl p-7 transition-all duration-300",
                plan.highlight
                  ? "bg-gradient-to-b from-primary via-blue-700 to-brand text-white shadow-lift lg:-my-3 lg:py-10"
                  : "surface hairline shadow-card hover:-translate-y-1 hover:shadow-lift",
              )}
            >
              {plan.badge ? (
                <span
                  className={cn(
                    "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-widest shadow-soft",
                    plan.highlight
                      ? "bg-accent text-white"
                      : "bg-primary-soft text-primary",
                  )}
                >
                  {plan.badge}
                </span>
              ) : null}

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    plan.highlight
                      ? "bg-white/15 backdrop-blur"
                      : "bg-primary-soft text-primary",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3
                    className={cn(
                      "text-lg font-extrabold tracking-tight",
                      plan.highlight ? "text-white" : "ink",
                    )}
                  >
                    {plan.name}
                  </h3>
                  {plan.blurb ? (
                    <p
                      className={cn(
                        "text-xs font-semibold",
                        plan.highlight ? "text-blue-100" : "ink-faint",
                      )}
                    >
                      {plan.blurb}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-6">
                <p
                  className={cn(
                    "text-4xl font-extrabold tracking-tight",
                    plan.highlight ? "text-white" : "ink",
                  )}
                >
                  {amountLabel(plan.amountKobo)}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xs font-semibold",
                    plan.highlight ? "text-blue-100" : "ink-faint",
                  )}
                >
                  {isFree ? "Free forever after intro" : "per month"}
                </p>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full",
                        plan.highlight ? "bg-white/15" : "bg-success-soft",
                      )}
                    >
                      <LuCheck
                        className={cn(
                          "h-3 w-3",
                          plan.highlight ? "text-white" : "text-success",
                        )}
                      />
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        plan.highlight ? "text-blue-50" : "ink",
                      )}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                onClick={() => {
                  try {
                    const posthog = (
                      window as unknown as {
                        posthog?: { capture?: (e: string, p?: object) => void };
                      }
                    ).posthog;
                    posthog?.capture?.("plan_selected", {
                      plan_code: plan.code,
                      surface,
                    });
                  } catch {
                    /* optional */
                  }
                }}
                className={cn(
                  "mt-8 w-full",
                  buttonClass(
                    plan.highlight ? "secondary" : "primary",
                    "lg",
                    plan.highlight ? "btn-shine" : "",
                  ),
                )}
              >
                {plan.cta}
              </Link>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

export function Pricing() {
  const { plans } = useBillingPlans();
  const description = useMemo(() => pricingSubtitle(plans), [plans]);

  return (
    <section id="pricing" className="scroll-mt-20">
      <div className="landing-container py-20 lg:py-28">
        <SectionHeader
          eyebrow="Simple pricing"
          title={
            <>
              Start on Standard free. Upgrade{" "}
              <span className="gradient-text animate-gradient-pan">
                when you&apos;re ready
              </span>
            </>
          }
          description={description}
        />

        <div className="mt-12">
          <PricingPlans surface="landing" />
        </div>

        <Reveal delay={120}>
          <p className="mt-8 text-center text-xs font-semibold ink-faint">
            Monthly subscriptions renew via Paystack. Cancel or change plans anytime
            from Settings. Prices are in Nigerian naira.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
