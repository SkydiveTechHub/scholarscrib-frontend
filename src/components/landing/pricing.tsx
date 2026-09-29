"use client";

import { useState } from "react";
import Link from "next/link";
import { LuCheck, LuCrown, LuSparkles, LuZap } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import {
  planFor,
  TIER_DISPLAY_NAMES,
  type SubscriptionTier,
} from "@/lib/subscription";
import { SectionHeader } from "./section";
import { Reveal } from "./reveal";

/**
 * Prices come from `planFor` so this page cannot drift from what Paystack
 * charges. Feature lists must match `ENTITLEMENTS` in lib/subscription.ts:
 * flashcards and the study planner need STANDARD ("Basic"); premium library
 * resources and the subject-level analytics breakdown need PREMIUM. Do not
 * list anything here that is not built — see PRD §10 item 3.
 */
const PLANS: {
  tier: SubscriptionTier;
  icon: typeof LuSparkles;
  blurb: string;
  cta: string;
  highlight: boolean;
  features: string[];
}[] = [
  {
    tier: "FREEMIUM",
    icon: LuSparkles,
    blurb: "For getting started",
    cta: "Start free",
    highlight: false,
    features: [
      "Up to 3 subjects",
      "Lesson notes for your class and term",
      "25 practice questions a day",
      "1 mock CBT exam",
      "Basic progress tracking",
    ],
  },
  {
    tier: "STANDARD",
    icon: LuZap,
    blurb: "For steady, term-by-term learning",
    cta: "Choose Basic",
    highlight: false,
    features: [
      "All subjects on your curriculum",
      "Unlimited practice, past questions & mock exams",
      "Smart flashcards & spaced repetition",
      "Personal study planner",
    ],
  },
  {
    tier: "PREMIUM",
    icon: LuCrown,
    blurb: "Everything, unlocked",
    cta: "Go Premium",
    highlight: true,
    features: [
      "Everything in Basic",
      "Subject-by-subject analytics breakdown",
      "Premium library: textbooks, videos & past papers",
    ],
  },
];

function formatPrice(naira: number) {
  return `₦${naira.toLocaleString("en-NG")}`;
}

function nairaFor(tier: SubscriptionTier, yearly: boolean) {
  return planFor(tier, yearly ? "YEARLY" : "MONTHLY").amountKobo / 100;
}

export function Pricing() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="scroll-mt-20">
      <div className="landing-container py-20 lg:py-28">
        <SectionHeader
          eyebrow="Simple pricing"
          title={
            <>
              Start free. Upgrade{" "}
              <span className="gradient-text animate-gradient-pan">
                when you’re ready
              </span>
            </>
          }
          description="No hidden fees, no contracts. Pay securely with Paystack, and only for what moves you forward."
        />

        <Reveal delay={100}>
          <div className="mt-10 flex items-center justify-center gap-3">
            <span
              className={cn(
                "text-sm font-bold",
                !yearly ? "ink" : "ink-faint",
              )}
            >
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={yearly}
              aria-label="Toggle yearly billing"
              onClick={() => setYearly((v) => !v)}
              className={cn(
                "relative h-7 w-14 rounded-full transition-colors duration-200",
                yearly ? "bg-primary" : "bg-secondary",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-5 w-5 rounded-full bg-white shadow-soft transition-all duration-200",
                  yearly ? "left-8" : "left-1",
                )}
              />
            </button>
            <span className={cn("text-sm font-bold", yearly ? "ink" : "ink-faint")}>
              Yearly
            </span>
            <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-extrabold text-success">
              Save up to 20%
            </span>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {PLANS.map((plan, i) => {
            const price = nairaFor(plan.tier, yearly);
            const isFree = price === 0;
            const name = TIER_DISPLAY_NAMES[plan.tier];
            return (
              <Reveal key={plan.tier} delay={i * 100} className="h-full">
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-3xl p-7 transition-all duration-300",
                    plan.highlight
                      ? "bg-gradient-to-b from-primary via-blue-700 to-brand text-white shadow-lift lg:-my-3 lg:py-10"
                      : "surface hairline shadow-card hover:-translate-y-1 hover:shadow-lift",
                  )}
                >
                  {plan.highlight ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-soft">
                      Recommended
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
                      <plan.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-extrabold tracking-tight ink">
                        {name}
                      </h3>
                      <p
                        className={cn(
                          "text-xs font-semibold",
                          plan.highlight ? "text-blue-100" : "ink-faint",
                        )}
                      >
                        {plan.blurb}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-4xl font-extrabold tracking-tight ink">
                      {formatPrice(price)}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-xs font-semibold",
                        plan.highlight ? "text-blue-100" : "ink-faint",
                      )}
                    >
                      {isFree
                        ? "Free forever"
                        : yearly
                          ? "per year, billed yearly"
                          : "per month, cancel anytime"}
                    </p>
                  </div>

                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full",
                            plan.highlight
                              ? "bg-white/15"
                              : "bg-success-soft",
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
                    href="/register"
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

        <Reveal delay={120}>
          <p className="mt-8 text-center text-xs font-semibold ink-faint">
            Every plan runs in the browser on any phone — no download needed.
            Cancel anytime.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
