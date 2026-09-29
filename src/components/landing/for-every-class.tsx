import {
  LuGraduationCap,
  LuRepeat,
  LuSprout,
  LuTrendingUp,
} from "react-icons/lu";
import { SectionHeader } from "./section";
import { Reveal } from "./reveal";

const STAGES = [
  {
    icon: LuSprout,
    stage: "SS1",
    title: "Build the foundation",
    text: "Follow each term’s topics as they are taught, form study habits early and check that last term’s work is still there.",
  },
  {
    icon: LuTrendingUp,
    stage: "SS2",
    title: "Close the gaps",
    text: "See which topics are weak or fading, get a plan that routes you back to them, and practise with past questions by topic.",
  },
  {
    icon: LuGraduationCap,
    stage: "SS3",
    title: "Get exam-ready",
    text: "Full CBT simulations, mock exams on the real grading scale and a revision plan that counts back from exam day.",
  },
  {
    icon: LuRepeat,
    stage: "Resit",
    title: "Come back stronger",
    text: "The whole curriculum and every past question in one place, with a clear view of what to fix before the next sitting.",
  },
];

export function ForEveryClass() {
  return (
    <section id="who-its-for" className="scroll-mt-20">
      <div className="landing-container py-20 lg:py-28">
        <SectionHeader
          eyebrow="Every stage counts"
          title={
            <>
              Not just for exam season.{" "}
              <span className="gradient-text animate-gradient-pan">
                For every class.
              </span>
            </>
          }
          description="Cramming in the final months is how students pass and forget. ScholarsCrib is built so that SS1, SS2 and every term of SS3 add up to real understanding — and exam success follows from it."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((stage, i) => (
            <Reveal key={stage.stage} delay={i * 80}>
              <div className="group relative h-full overflow-hidden rounded-2xl surface hairline p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-blue-600 to-brand text-white shadow-soft transition-transform duration-300 group-hover:scale-110">
                    <stage.icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-extrabold text-primary-soft-foreground">
                    {stage.stage}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-extrabold tracking-tight ink">
                  {stage.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed ink-muted">
                  {stage.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
