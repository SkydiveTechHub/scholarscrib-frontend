import { Reveal } from "./reveal";

const BUILT_FOR = [
  { label: "WAEC", detail: "WASSCE" },
  { label: "JAMB", detail: "UTME" },
  { label: "NECO", detail: "SSCE" },
  { label: "SS1 · SS2 · SS3", detail: "Term by term" },
  { label: "Resits", detail: "WASSCE / GCE" },
];

/**
 * Stands in for a "trusted by" logo wall until there are real partners to
 * name. The non-affiliation notice (PRD §15) lives in the footer and FAQ.
 */
export function BuiltFor() {
  return (
    <section className="border-y hairline">
      <div className="landing-container py-12">
        <Reveal>
          <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.2em] ink-faint">
            Built on the Nigerian senior-secondary curriculum
          </p>
        </Reveal>

        <Reveal delay={80}>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {BUILT_FOR.map((item) => (
              <li key={item.label} className="text-center">
                <p className="text-lg font-extrabold tracking-tight ink">
                  {item.label}
                </p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-widest ink-faint">
                  {item.detail}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>

      </div>
    </section>
  );
}
