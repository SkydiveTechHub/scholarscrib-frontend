import { z } from "zod";

const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().max(1024).refine(isHttpsUrl, "Endpoint must be an https URL"),
  keys: z.object({
    p256dh: z.string().min(80).max(100).regex(BASE64URL),
    auth: z.string().min(16).max(32).regex(BASE64URL),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export type NotificationPreferences = {
  studyReminders: boolean;
  streakReminders: boolean;
  announcements: boolean;
};
