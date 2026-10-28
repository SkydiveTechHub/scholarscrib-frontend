import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getStudentAchievements } from "@/lib/achievements";
import { getStreak, getXpProfile } from "@/lib/gamification-data";
import { AchievementsView } from "@/components/achievements/achievements-view";

// Server-rendered. Previously this mounted a spinner and fetched
// /api/achievements from the browser, so the page was always two round-trips
// away from showing anything.
export default async function AchievementsPage() {
  const session = await getSessionUser();
  if (!session?.id) redirect("/login");

  const [achievements, xp, streak] = await Promise.all([
    getStudentAchievements(),
    getXpProfile(),
    getStreak(),
  ]);

  return <AchievementsView achievements={achievements} xp={xp} streak={streak} />;
}
