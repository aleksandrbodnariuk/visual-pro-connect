import { supabase } from "@/integrations/supabase/client";

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  return Notification.requestPermission();
}

// Cache the VAPID key after fetching
let cachedVapidKey: string | null = null;

/**
 * Fetch the VAPID public key from the edge function
 */
export async function getVapidPublicKey(): Promise<string> {
  if (cachedVapidKey) return cachedVapidKey;

  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/send-push-notification`,
      { method: 'GET' }
    );
    const data = await res.json();
    if (data.vapidPublicKey) {
      cachedVapidKey = data.vapidPublicKey;
      return data.vapidPublicKey;
    }
  } catch (err) {
    console.error('[Push] Failed to fetch VAPID key:', err);
  }
  return '';
}

/**
 * Subscribe to push notifications and save subscription to Supabase.
 * Returns the PushSubscription or null on failure.
 */
export async function subscribeToPush(vapidPublicKey?: string): Promise<PushSubscription | null> {
  try {
    const key = vapidPublicKey || await getVapidPublicKey();
    if (!key) {
      console.error('[Push] No VAPID public key available');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;

    // Check existing subscription
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await saveSubscription(existing);
      return existing;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key).buffer as ArrayBuffer,
    });

    await saveSubscription(subscription);
    return subscription;
  } catch (err) {
    console.error("[Push] Subscribe failed:", err);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    const success = await subscription.unsubscribe();
    if (success) {
      await removeSubscription(subscription);
    }
    return success;
  } catch (err) {
    console.error("[Push] Unsubscribe failed:", err);
    return false;
  }
}

// ── Internal helpers ────────────────────────────────────

async function saveSubscription(subscription: PushSubscription) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const sub = subscription.toJSON();

  await supabase.from("push_subscriptions" as any).upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys?.p256dh,
      auth: sub.keys?.auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );
}

async function removeSubscription(subscription: PushSubscription) {
  const sub = subscription.toJSON();
  await supabase.from("push_subscriptions" as any).delete().eq("endpoint", sub.endpoint);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
