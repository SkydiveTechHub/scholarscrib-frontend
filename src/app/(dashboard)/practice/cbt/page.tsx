import { redirect } from "next/navigation";
import { LuMonitor, LuTimer, LuTarget, LuCheck, LuTriangleAlert } from "react-icons/lu";
import { getSessionUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { getJambSubjectOptions } from "@/lib/jamb-availability";
import { JAMB_SPEC } from "@/lib/jamb-cbt";
import { JambCbtPicker } from "@/components/practice/jamb-cbt-picker";

const FACTS = [
  {
    icon: <LuTarget className="h-5 w-5" />,
    label: `${JAMB_SPEC.totalQuestions} questions`,
    detail: `English ${JAMB_SPEC.englishQuestions} · ${JAMB_SPEC.otherQuestions} per other subject`,
  },
  {
    icon: <LuTimer className="h-5 w-5" />,
    label: `${JAMB_SPEC.durationMinutes} minutes`,
    detail: "Auto-submits when the time runs out",
  },
  {
    icon: <LuCheck className="h-5 w-5" />,
    label: `Marked out of ${JAMB_SPEC.totalMarks}`,
    detail: `Every subject is worth ${JAMB_SPEC.marksPerSubject}`,
  },
];

// The real JAMB UTME: four subjects in one sitting, English compulsory.
export default async function CBTPracticePage() {
  const session = await getSessionUser();
  if (!session?.id) redirect("/login");

  const options = await getJambSubjectOptions();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="JAMB CBT Simulator"
        description="A full UTME sitting under real conditions — four subjects, one year, one clock."
      />

      <section className="card mb-8 overflow-hidden p-5 md:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <LuMonitor className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">
              Official UTME format
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Every subject is the real past paper for the year you pick, in the
              order it was set, so the sitting is the exam as it was.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {FACTS.map((fact) => (
            <div
              key={fact.label}
              className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3.5"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                {fact.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{fact.label}</p>
                <p className="truncate text-xs text-muted">{fact.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {options ? (
        <JambCbtPicker
          english={options.english}
          subjects={options.subjects}
          track={session.track ?? null}
        />
      ) : (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-warning"
        >
          <LuTriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">JAMB papers are unavailable right now.</p>
            <p className="mt-0.5 leading-relaxed">
              The question bank couldn&apos;t be reached. Refresh the page in a
              minute to try again.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
