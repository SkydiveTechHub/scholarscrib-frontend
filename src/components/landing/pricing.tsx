"use client";

import { useState } from "react";
import Link from "next/link";
import { LuCheck, LuCrown, LuSparkles, LuZap } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { TIER_DISPLAY_NAMES, planFor } from "@/lib/subscription";
import { SectionHeader } from "./section";
import { Reveal } from "./reveal";

// Prices come from the same table checkout uses, so this page cannot drift from
// what a buyer is actually charged. Feature lists mirror ENTITLEMENTS in
// `@/lib/subscription`: add a gate there and its line here together.
function naira(tier: "STANDARD" | "PREMIUM", period: "MONTHLY" | "YEARLY") {
  return planFor(tier, period).amountKobo / 100;
}

const PLANS = [
  {
    name: TIER_DISPLAY_NAMES.FREEMIUM,
    icon: LuSparkles,
    blurb: "To get started",
    monthly: 0,
    yearly: 0,
    cta: "Start free",
    href: "/register",
    highlight: false,
    features: [
      "Lessons and past-question practice",
      "Basic progress tracking",
    ],
  },
  {
    name: TIER_DISPLAY_NAMES.STANDARD,
    icon: LuZap,
    blurb: "Flashcards and study planning",
    monthly: naira("STANDARD", "MONTHLY"),
    yearly: naira("STANDARD", "YEARLY"),
    cta: "Get Basic",
    href: "/register",
    highlight: false,
    features: [
      "Everything in Free",
      "Smart flashcards & spaced repetition",
      "Study planner",
    ],
  },
  {
    name: TIER_DISPLAY_NAMES.PREMIUM,
    icon: LuCrown,
    blurb: "Full library and analytics",
    monthly: naira("PREMIUM", "MONTHLY"),
    yearly: naira("PREMIUM", "YEARLY"),
    cta: "Get Premium",
    href: "/register",
    highlight: true,
    features: [
      "Everything in Basic",
      "Premium library resources",
      "Subject-level performance analytics",
    ],
  },
];

/** Whole-number saving of paying yearly instead of twelve months. */
function yearlySavingPercent(monthly: number, yearly: number) {
  if (monthly <= 0) return 0;
  return Math.round((1 - yearly / (monthly * 12)) * 100);
}

const MAX_SAVING = Math.max(
  ...PLANS.map((p) => yearlySavingPercent(p.monthly, p.yearly)),
);

function formatPrice(naira: number) {
  return `₦${naira.toLocaleString("en-NG")}`;
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
          description="Start on the Free plan, and upgrade when you want flashcards, study planning or deeper analytics."
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
              Save up to {MAX_SAVING}%
            </span>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {PLANS.map((plan, i) => {
            const price = yearly ? plan.yearly : plan.monthly;
            const isFree = plan.monthly === 0;
            const saving = yearlySavingPercent(plan.monthly, plan.yearly);
            return (
              <Reveal key={plan.name} delay={i * 100} className="h-full">
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
                      <h3
                        className={cn(
                          "text-lg font-extrabold tracking-tight",
                          plan.highlight ? "text-white" : "ink",
                        )}
                      >
                        {plan.name}
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
                    <p
                      className={cn(
                        "text-4xl font-extrabold tracking-tight",
                        plan.highlight ? "text-white" : "ink",
                      )}
                    >
                      {isFree ? "₦0" : formatPrice(price)}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-xs font-semibold",
                        plan.highlight ? "text-blue-100" : "ink-faint",
                      )}
                    >
                      {isFree
                        ? "Free to start"
                        : yearly
                          ? `per year · saves ${saving}% vs monthly`
                          : "per month"}
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
                    href={plan.href}
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
            Each paid plan is a single payment for 1 month or 12 months of access. Plans do not renew automatically, and we do not charge you again unless you choose to buy. Prices are in Nigerian naira; payments are processed by Paystack.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
