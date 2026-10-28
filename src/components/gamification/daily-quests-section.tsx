import { getDailyQuests } from "@/lib/gamification-data";
import { DailyQuestsCard } from "@/components/gamification/daily-quests";

/** Streams in separately so quests never hold up the dashboard. */
export async function DailyQuestsSection() {
  const data = await getDailyQuests();
  if (!data || data.quests.length === 0) return null;
  return <DailyQuestsCard data={data} />;
}
