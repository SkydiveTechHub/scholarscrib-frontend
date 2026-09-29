import {
  LuArrowRight,
  LuBookOpen,
  LuCalendarClock,
  LuClipboardList,
  LuScanSearch,
} from "react-icons/lu";
import { SectionHeader } from "./section";
import { Reveal } from "./reveal";

/** The Teach → Test → Diagnose → Plan loop from PRD §5. */
const LOOP = [
  {
    icon: LuBookOpen,
    stage: "Teach",
    title: "Learn the topic",
    text: "Notes for every topic in your class and term, with key points, worked examples and properly rendered maths.",
  },
  {
    icon: LuClipboardList,
    stage: "Test",
    title: "Practise like the real thing",
    text: "Past questions, topic practice, mock exams and a full JAMB CBT — timed and graded exactly like the real papers.",
  },
  {
    icon: LuScanSearch,
    stage: "Diagnose",
    title: "See what you really know",
    text: "Every answer counts as evidence. Mastery fades if you don’t revisit a topic, so forgetting is caught before it costs you marks.",
  },
  {
    icon: LuCalendarClock,
    stage: "Plan",
    title: "Know what to study next",
    text: "A week-by-week plan built around your weak and fading topics — and counted back from exam day once you set one.",
  },
];

export function Journey() {
  return (
    <section id="how-it-works" className="relative scroll-mt-20 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-dots opacity-50 mask-fade-b"
        aria-hidden
      />
      <div className="landing-container relative py-20 lg:py-28">
        <SectionHeader
          eyebrow="How it works"
          title={
            <>
              One loop that turns study into{" "}
              <span className="gradient-text animate-gradient-pan">
                real understanding
              </span>
            </>
          }
          description="Most apps give you notes or questions. ScholarsCrib connects them: a wrong answer changes what we know about you, which changes your plan, which sends you back to the right lesson."
        />

        <div className="relative mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP.map((step, i) => (
            <Reveal key={step.stage} delay={i * 90}>
              <div className="group relative h-full rounded-2xl surface hairline p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-brand text-white shadow-soft transition-transform duration-300 group-hover:scale-105">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
                    {i + 1} · {step.stage}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-extrabold tracking-tight ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed ink-muted">
                  {step.text}
                </p>
                {i < LOOP.length - 1 ? (
                  <LuArrowRight
                    className="absolute -right-5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-primary/40 lg:block"
                    aria-hidden
                  />
                ) : null}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <p className="mt-10 text-center text-sm font-semibold ink-muted">
            …and back to Teach. The loop keeps running from your first SS1 topic
            to exam day.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
