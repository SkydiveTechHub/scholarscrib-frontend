import { Hero } from "@/components/landing/hero";
import { BuiltFor } from "@/components/landing/built-for";
import { ForEveryClass } from "@/components/landing/for-every-class";
import { Journey } from "@/components/landing/journey";
import { WhyUs } from "@/components/landing/why-us";
import { Showcase } from "@/components/landing/showcase";
import { DeepDive } from "@/components/landing/deep-dive";
import { Subjects } from "@/components/landing/subjects";
import { StatsBand } from "@/components/landing/stats";
import { Pricing } from "@/components/landing/pricing";
import { Roadmap } from "@/components/landing/roadmap";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { FAQS } from "@/components/landing/faq-data";
import { faqPageJsonLd, organisationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";

export const metadata = buildMetadata({
  title: "ScholarsCrib — Learn It. Remember It. Ace WAEC, JAMB & NECO.",
  description:
    "School on your phone for Nigerian SS1–SS3 students. Term-by-term lessons, real past questions, a full JAMB CBT simulation, spaced-repetition flashcards and a study plan built around what you actually remember.",
  path: "/",
});

/**
 * Section order follows the PRD v0.3 positioning: exam readiness is the way
 * in (hero), learning quality across every class is the product (the rest).
 */
export default function LandingPage() {
  return (
    <>
      <JsonLd data={organisationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={faqPageJsonLd(FAQS)} />
      <Hero />
      <BuiltFor />
      <ForEveryClass />
      <Journey />
      <WhyUs />
      <Showcase />
      <DeepDive />
      <Subjects />
      <StatsBand />
      <Pricing />
      <Roadmap />
      <Faq />
      <FinalCta />
    </>
  );
}
