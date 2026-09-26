import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getSettingsProfile } from "@/lib/settings";
import { isEntitled, tierOf, tierOfSession } from "@/lib/entitlements";
import { requiredTierFor } from "@/lib/subscription";
import { PageHeader } from "@/components/ui/page-header";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { getStudyPlanPageData } from "@/lib/study-plan-route";
import { StudyPlanView } from "@/components/study-plan/study-plan-view";
import { ReminderOptInCard } from "@/components/study-plan/reminder-opt-in-card";
import { isPushEnabled } from "@/lib/features";

const DESCRIPTION =
  "A realistic weekly schedule that keeps you in step with your class — and gets you exam-ready when it's time.";

export default async function StudyPlanPage() {
  const session = await getSessionUser();
  if (!session?.id) redirect("/login");

  // The session may not carry a tier claim, so fall back to the profile the
  // backend owns before deciding whether to show the paywall.
  const tier = session.tier
    ? tierOfSession({ user: session })
    : tierOf((await getSettingsProfile())?.tier);
  if (!isEntitled(session.id, tier, "studyPlanner")) {
    return (
      <div className="space-y-8">
        <PageHeader title="Study plan" description={DESCRIPTION} />
        <UpgradePrompt
          feature="The study planner"
          requiredTier={requiredTierFor("studyPlanner")}
          description="Get a week-by-week plan that follows your school term, fills the gaps you've missed, and moves missed sessions instead of letting them pile up."
        />
      </div>
    );
  }

  const data = await getStudyPlanPageData();

  return (
    <>
      {data.plan && <ReminderOptInCard enabled={isPushEnabled()} />}
      <StudyPlanView data={data} />
    </>
  );
}
