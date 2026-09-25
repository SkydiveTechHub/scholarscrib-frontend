import { api } from "@/lib/api/server";
import type {
  NotificationPreferences,
  PushSubscriptionInput,
} from "@/lib/push-validators";

export type { PushSubscriptionInput };

const DEFAULT_PREFERENCES: NotificationPreferences = {
  studyReminders: true,
  streakReminders: true,
  announcements: true,
};

/**
 * Preference rows now live on the FastAPI backend. The id is kept in the
 * signature so callers need no change, but the cookie already identifies the
 * student — the backend applies its own scoping.
 */
export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  const row = (await api("/api/user/notification-preferences").catch(() => null)) as
    | Partial<NotificationPreferences>
    | null;
  return {
    studyReminders:
      typeof row?.studyReminders === "boolean"
        ? row.studyReminders
        : DEFAULT_PREFERENCES.studyReminders,
    streakReminders:
      typeof row?.streakReminders === "boolean"
        ? row.streakReminders
        : DEFAULT_PREFERENCES.streakReminders,
    announcements:
      typeof row?.announcements === "boolean"
        ? row.announcements
        : DEFAULT_PREFERENCES.announcements,
  };
}