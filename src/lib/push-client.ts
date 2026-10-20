"use client";

import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import {
  detectIOS,
  isPushWorkerVersion,
  pushCapability,
  type PushCapability,
  type PushEnvSnapshot,
} from "@/lib/push-capability";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function hasPushApis(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!hasPushApis()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function readPushState(): Promise<PushCapability> {
  const apis = hasPushApis();
  const snapshot: PushEnvSnapshot = {
    configured: PUBLIC_KEY.length > 0,
    hasServiceWorker: typeof navigator !== "undefined" && "serviceWorker" in navigator,
    hasPushManager: typeof window !== "undefined" && "PushManager" in window,
    hasNotification: typeof window !== "undefined" && "Notification" in window,
    permission: apis ? (Notification.permission as PushEnvSnapshot["permission"]) : "default",
    isIOS: detectIOS({ userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints }),
    isStandalone: window.matchMedia("(display-mode: standalone)").matches,
    hasSubscription: apis ? (await currentSubscription().catch(() => null)) !== null : false,
  };
  return pushCapability(snapshot);
}

function workerVersion(registration: ServiceWorkerRegistration): Promise<string | null> {
  const worker = registration.active;
  if (!worker) return Promise.resolve(null);
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 1500);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(typeof event.data?.version === "string" ? event.data.version : null);
    };
    worker.postMessage({ type: "GET_VERSION" }, [channel.port2]);
  });
}

async function postSubscription(subscription: PushSubscription): Promise<boolean> {
  try {
    await request({
      method: "POST",
      url: endpoints.push.subscription,
      data: subscription.toJSON(),
    });
    return true;
  } catch {
    return false;
  }
}

export type WorkerReadiness = "ready" | "needs-reload" | "unsupported";

const WORKER_READY_TIMEOUT_MS = 10_000;

/**
 * Is the active service worker one that can show pushes? Call on mount, not
 * from a click: the awaits here would spend the user gesture that
 * Notification.requestPermission() needs (WebKit rejects a late prompt).
 */
export async function checkWorkerReady(): Promise<WorkerReadiness> {
  if (!hasPushApis()) return "unsupported";
  try {
    // ready never settles when no worker is registered.
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), WORKER_READY_TIMEOUT_MS)),
    ]);
    if (!registration) return "needs-reload";
    // A v1 worker has no push handler; a subscription it owns would receive
    // pushes that show nothing.
    return isPushWorkerVersion(await workerVersion(registration)) ? "ready" : "needs-reload";
  } catch {
    return "needs-reload";
  }
}

export type SubscribeResult = "subscribed" | "denied" | "needs-reload" | "unsupported" | "failed";

/**
 * Call only from a click handler, and only after checkWorkerReady() returned
 * "ready": the permission prompt is the FIRST await so it keeps the gesture.
 */
export async function subscribeThisDevice(): Promise<SubscribeResult> {
  if (!hasPushApis() || !PUBLIC_KEY) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    if (permission === "denied") return "denied";
    if (permission !== "granted") return "failed";

    // Re-checked after the prompt, so no await precedes it.
    const readiness = await checkWorkerReady();
    if (readiness !== "ready") return readiness;
    const registration = await navigator.serviceWorker.ready;

    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
      }));
    return (await postSubscription(subscription)) ? "subscribed" : "failed";
  } catch (error) {
    console.error("Push subscribe failed", error);
    return "failed";
  }
}

/**
 * Removes this device on the server first (while the session still exists),
 * then in the browser. Bounded to 3s so sign-out never hangs on it.
 */
export async function unsubscribeThisDevice(): Promise<void> {
  const work = (async () => {
    const subscription = await currentSubscription();
    if (!subscription) return;
    await request({
      method: "DELETE",
      url: endpoints.push.subscription,
      data: { endpoint: subscription.endpoint },
    }).catch(() => undefined);
    await subscription.unsubscribe().catch(() => undefined);
  })().catch(() => undefined);
  await Promise.race([work, new Promise((resolve) => setTimeout(resolve, 3000))]);
}

function sameKey(subscription: PushSubscription, base64: string): boolean {
  const current = subscription.options.applicationServerKey;
  if (!current) return true; // Unknown: assume fine rather than churn the endpoint.
  const a = new Uint8Array(current);
  const b = urlBase64ToUint8Array(base64);
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}

async function postWithRetry(subscription: PushSubscription): Promise<boolean> {
  for (const delay of [0, 2000, 8000]) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    if (await postSubscription(subscription)) return true;
  }
  return false;
}

let syncing: Promise<void> | null = null;

/**
 * Makes the server's record of this device match the browser's. Runs on every
 * app load for a signed-in student with notification permission, so a device
 * is registered even when the opt-in POST failed, the browser rotated or
 * dropped its subscription, or the VAPID key changed. No prompt is shown:
 * without permission this does nothing.
 */
export function syncThisDevice(): Promise<void> {
  syncing ??= (async () => {
    try {
      if (!hasPushApis() || !PUBLIC_KEY || Notification.permission !== "granted") return;
      if ((await checkWorkerReady()) !== "ready") return;
      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (subscription && !sameKey(subscription, PUBLIC_KEY)) {
        await subscription.unsubscribe().catch(() => undefined);
        subscription = null;
      }
      subscription ??= await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
      });
      await postWithRetry(subscription);
    } catch (error) {
      // Offline or signed out mid-request. The next trigger tries again.
      console.warn("Push sync failed", error);
    }
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}
