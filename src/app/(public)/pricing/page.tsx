import { PricingPlans } from "@/components/landing/pricing";
import { FinalCta } from "@/components/landing/final-cta";
import { SectionHeader } from "@/components/landing/section";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

const TITLE = "Pricing — ScholarsCrib Free, Standard and Premium";
const DESCRIPTION =
  "Start with a free Standard month. Then stay on Free, or upgrade to Standard (₦3,000/mo) or Premium (₦10,000/mo) for explanations, study plans, and more AI tutor capacity.";

export const metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Pricing", path: "/pricing" },
        ])}
      />
      <section className="scroll-mt-20">
        <div className="landing-container py-20 lg:py-28">
          <SectionHeader
            eyebrow="Pricing"
            title={
              <>
                Plans that grow with{" "}
                <span className="gradient-text animate-gradient-pan">your exam prep</span>
              </>
            }
            description={DESCRIPTION}
          />
          <div className="mt-12">
            <PricingPlans surface="pricing_page" />
          </div>
          <p className="mt-8 text-center text-xs font-semibold ink-faint">
            Monthly subscriptions renew via Paystack. Cancel or change plans anytime
            from Settings. Prices are in Nigerian naira.
          </p>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
