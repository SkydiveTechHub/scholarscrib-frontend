import { AboutHero } from "@/components/about/hero";
import { AboutStory } from "@/components/about/story";
import { AboutValues } from "@/components/about/values";
import { FinalCta } from "@/components/landing/final-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { aboutPageJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

const TITLE = "About ScholarsCrib — Why we build for Nigerian students";
const DESCRIPTION =
  "ScholarsCrib is a Nigerian learning platform for WAEC, JAMB and NECO. Read why we built it, what we hold to, and who it is for.";

export const metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={aboutPageJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path: "/about",
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
      <AboutHero />
      <AboutStory />
      <AboutValues />
      <section>
        <div className="landing-container pb-20 lg:pb-28">
          <div className="border-t hairline pt-7">
            <h2 className="text-base font-extrabold tracking-tight ink">
              Disclaimer
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed ink-muted">
              ScholarsCrib is an independent learning platform. We are not
              affiliated with, endorsed by, or sponsored by any examination
              body, government agency, school or organisation, including WAEC,
              NECO and JAMB. Exam names are used only to describe the
              examinations our content helps students prepare for.
            </p>
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
