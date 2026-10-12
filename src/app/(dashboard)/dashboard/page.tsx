import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LuTarget,
  LuBookOpen,
  LuTrendingUp,
  LuFlame,
  LuArrowRight,
  LuFileText,
  LuTimer,
  LuMonitor,
  LuBook,
  LuSparkles,
} from "react-icons/lu";
import { getSessionUser } from "@/lib/session";
import { DASHBOARD_ATTEMPTS_PAGE_SIZE, getDashboardData } from "@/lib/dashboard";
import { Pagination, pageWindow } from "@/components/ui/pagination";
import { Greeting } from "@/components/ui/greeting";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { TodaysSession } from "@/components/path/todays-session";
import { InstallBanner } from "@/components/pwa/install-banner";

const STAT_CARDS = [
  {
    key: "questions",
    label: "Questions Practiced",
    icon: LuTarget,
    tile: "bg-primary-soft text-primary",
  },
  {
    key: "topics",
    label: "Topics Covered",
    icon: LuBookOpen,
    tile: "bg-success-soft text-success",
  },
  {
    key: "accuracy",
    label: "Overall Accuracy",
    icon: LuTrendingUp,
    tile: "bg-tone-purple-soft text-tone-purple-ink",
  },
  {
    key: "week",
    label: "This Week",
    icon: LuFlame,
    tile: "bg-tone-orange-soft text-tone-orange-ink",
  },
];

const QUICK_LINKS = [
  {
    title: "Past Questions",
    description: "WAEC · JAMB · NECO",
    href: "/practice/past-questions",
    icon: LuFileText,
    tile: "bg-tone-green-soft text-tone-green-ink",
  },
  {
    title: "Mock Exam",
    description: "Timed, full-length",
    href: "/practice/mock-exam",
    icon: LuTimer,
    tile: "bg-tone-purple-soft text-tone-purple-ink",
  },
  {
    title: "JAMB CBT",
    description: "180 questions · 2hrs",
    href: "/practice/cbt",
    icon: LuMonitor,
    tile: "bg-tone-blue-soft text-tone-blue-ink",
  },
  {
    title: "Classroom",
    description: "Notes, quizzes and practice",
    href: "/classroom",
    icon: LuBookOpen,
    tile: "bg-primary-soft text-primary",
  },
  {
    title: "Flashcards",
    description: "Spaced repetition",
    href: "/flashcards",
    icon: LuSparkles,
    tile: "bg-tone-indigo-soft text-tone-indigo-ink",
  },
  {
    title: "Library",
    description: "Textbooks & notes",
    href: "/library",
    icon: LuBook,
    tile: "bg-tone-amber-soft text-tone-amber-ink",
  },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ activity?: string }>;
}) {
  const session = await getSessionUser();
  if (!session?.id) redirect("/login");

  // Its own key rather than `page`, so the activity pager cannot collide with
  // anything else the dashboard grows later.
  const parsedActivity = Number.parseInt((await searchParams).activity ?? "1", 10);
  // The backend clamps below 1 too; clamping here keeps the pager honest.
  const activityPage =
    Number.isNaN(parsedActivity) || parsedActivity < 1 ? 1 : parsedActivity;

  const {
    totalResponses,
    accuracy,
    topicCount,
    lastWeekActivity,
    // Today's session stays hidden until the student has
    // engaged somewhere: a completed attempt, an answered question, or any
    // learning evidence (lessons, flashcards). The backend decides.
    hasActivity,
    hasStudyPlan,
    todayPlan,
    bestScore,
    recentAttempts,
    attemptTotal,
    subjects,
    session: todaysSession,
  } = await getDashboardData(activityPage);

  const activityWindow = pageWindow({
    page: activityPage,
    pageSize: DASHBOARD_ATTEMPTS_PAGE_SIZE,
    total: attemptTotal,
  });
  // A hand-edited `?activity=` past the end skipped every row. Bounce to the
  // last real page rather than render the section empty.
  if (attemptTotal > 0 && recentAttempts.length === 0) {
    redirect(
      activityWindow.page > 1
        ? `/dashboard?activity=${activityWindow.page}#recent-activity`
        : "/dashboard",
    );
  }

  const firstName = session.firstName ?? undefined;

  const statValues: Record<string, string> = {
    questions: totalResponses.toString(),
    topics: topicCount.toString(),
    accuracy: accuracy !== null ? `${accuracy}%` : "—",
    week: `${lastWeekActivity} attempt${lastWeekActivity === 1 ? "" : "s"}`,
  };

  return (
    <div className="space-y-8">
      <InstallBanner />
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-hero-from via-hero-via to-hero-to p-6 shadow-lift md:p-8">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute right-24 top-10 hidden h-10 w-10 rounded-2xl bg-white/10 md:block" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              <Greeting name={firstName} />!
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-hero-ink">
              {hasActivity
                ? "You're making real progress. A little focus each day compounds into a great result."
                : "Every champion starts with a first question. Let's take yours together."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/practice/past-questions"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-hero-from shadow-soft transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <LuSparkles className="h-4 w-4" />
                Start practicing
              </Link>
              {/* Without a plan there is nothing to "view" — the link has to
                  ask for the thing that doesn't exist yet. */}
              <Link
                href="/study-plan"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                {todayPlan
                  ? `Today: ${todayPlan.done} of ${todayPlan.total} done`
                  : hasStudyPlan
                    ? "View study plan"
                    : "Create study plan"}
                <LuArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {hasActivity && bestScore !== null && (
            <div className="rounded-2xl bg-white/10 px-6 py-4 text-center backdrop-blur">
              <p className="text-3xl font-bold text-white">{bestScore.toFixed(1)}%</p>
              <p className="mt-0.5 text-xs font-medium text-hero-ink">
                Best recent score
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Stats */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="section-label">Your progress</h2>
          {hasActivity && accuracy !== null && (
            <span className="text-xs font-semibold text-muted">
              {totalResponses} questions answered
            </span>
          )}
        </div>
        <p className="mb-3 text-xs text-muted">
          Built from every question answered on this account.
        </p>
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {STAT_CARDS.map((stat) => (
            <div
              key={stat.key}
              className="card card-interactive p-4 md:p-5"
            >
              <div
                className={cn(
                  "mb-3 flex h-10 w-10 items-center justify-center rounded-xl",
                  stat.tile,
                )}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {statValues[stat.key]}
              </p>
              <p className="mt-0.5 text-xs font-medium text-muted">
                {stat.label}
              </p>
              {stat.key === "accuracy" && accuracy !== null && (
                <Progress value={accuracy} className="mt-3 h-1.5" tone="auto" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Today's session (hidden until the student has activity) */}
      {hasActivity && todaysSession && (
        <section>
          <h2 className="mb-3 section-label">Today&apos;s session</h2>
          <TodaysSession session={todaysSession} subjects={subjects} />
        </section>
      )}

      {/* Quick launch */}
      <section>
        <h2 className="mb-3 section-label">Jump back in</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="card card-interactive group flex items-center gap-3 p-4"
            >
              <div
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                  link.tile,
                )}
              >
                <link.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {link.title}
                </p>
                <p className="truncate text-xs text-muted">{link.description}</p>
              </div>
              <LuArrowRight className="h-4 w-4 flex-shrink-0 text-muted transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section id="recent-activity">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-label">Recent activity</h2>
          {attemptTotal > 0 && (
            <Link
              href="/performance"
              className="text-xs font-bold text-primary hover:underline"
            >
              View all
            </Link>
          )}
        </div>
        {attemptTotal > 0 ? (
          <>
            <div className="space-y-3">
              {recentAttempts.map((attempt) => (
                <Link
                  key={attempt.id}
                  href={`/practice/results/${attempt.id}`}
                  className="card card-interactive group flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {attempt.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {attempt.completedAt
                        ? new Date(attempt.completedAt).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "In progress"}
                    </p>
                  </div>
                  {attempt.percentage !== null && (
                    <span
                      className={cn(
                        "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
                        attempt.percentage >= 50
                          ? "border-success/30 bg-success-soft text-success"
                          : "border-tone-red-line bg-tone-red-soft text-danger",
                      )}
                    >
                      {Math.round(attempt.percentage)}%
                    </span>
                  )}
                </Link>
              ))}
            </div>
            <Pagination
              window={activityWindow}
              basePath="/dashboard"
              params={{}}
              pageParam="activity"
              label="Recent activity pagination"
              hash="recent-activity"
            />
          </>
        ) : (
          <EmptyState
            icon={<LuTarget className="h-6 w-6" />}
            title="Ready when you are"
            description="No attempts yet. Start with a subject quiz or a set of past questions — you'll see your history here."
            action={
              <Link
                href="/practice/past-questions"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover"
              >
                Pick your first quiz
                <LuArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
