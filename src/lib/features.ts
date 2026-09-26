// Feature switches the frontend can see. The secrets behind billing and push
// (Paystack, VAPID private key, cron secret) live on the backend only; this
// app just needs to know whether to offer the UI. Both default to off.
//
// Each variable is read with a literal `process.env.NEXT_PUBLIC_…` so Next can
// inline it into client bundles too. Tests pass an env object instead.

type Env = Record<string, string | undefined>;

const publicEnv = (): Env => ({
  NEXT_PUBLIC_BILLING_ENABLED: process.env.NEXT_PUBLIC_BILLING_ENABLED,
  NEXT_PUBLIC_PUSH_ENABLED: process.env.NEXT_PUBLIC_PUSH_ENABLED,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
});

const on = (value: string | undefined) => value?.trim() === "true";

/** Whether to offer checkout. The backend still answers 503 when it isn't configured. */
export function isBillingEnabled(env: Env = publicEnv()): boolean {
  return on(env.NEXT_PUBLIC_BILLING_ENABLED);
}

/** Whether to offer push. Subscribing needs the backend's public VAPID key. */
export function isPushEnabled(env: Env = publicEnv()): boolean {
  return on(env.NEXT_PUBLIC_PUSH_ENABLED) && !!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
}
