import { getStreak } from "@/lib/gamification-data";
import { ReturnPrompt } from "@/components/gamification/return-prompt";

/** Streams in separately; renders nothing when there is nothing to say. */
export async function ReturnPromptSection() {
  const streak = await getStreak();
  return streak ? <ReturnPrompt streak={streak} /> : null;
}
