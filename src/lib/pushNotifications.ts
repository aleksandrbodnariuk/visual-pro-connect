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
    const url = `https://${projectId}.supabase.co/functions/v1/send-push-notification`;
    console.log('[Push] Fetching VAPID key from:', url);
    const res = await fetch(url, { method: 'GET' });
    console.log('[Push] VAPID response status:', res.status);
    const data = await res.json();
    console.log('[Push] VAPID response data:', data);
    if (data.vapidPublicKey) {
      // Strip accidental surrounding quotes from the key
      const cleanKey = data.vapidPublicKey.replace(/^"|"$/g, '').trim();
      console.log('[Push] Clean VAPID key:', cleanKey.substring(0, 20) + '...');
      cachedVapidKey = cleanKey;
      return cleanKey;
    }
    console.warn('[Push] No vapidPublicKey in response');
  } catch (err) {
    console.error('[Push] Failed to fetch VAPID key:', err);
  }
  return '';
}

/**
 * Subscribe to push notifications and save subscription to Supabase.
 * Returns the PushSubscription or null on failure.
 */
export async function subscribeToPush(
  vapidPublicKey?: string,
  options: { forceRefresh?: boolean } = {}
): Promise<PushSubscription | null> {
  try {
    console.log('[Push] subscribeToPush started');
    console.log('[Push] Notification.permission:', Notification.permission);
    
    const key = vapidPublicKey || await getVapidPublicKey();
    console.log('[Push] VAPID key obtained:', key ? `${key.substring(0, 20)}...` : 'EMPTY');
    if (!key) {
      throw new Error('VAPID public key is empty — Edge Function may not have VAPID_PUBLIC_KEY secret configured');
    }

    console.log('[Push] Waiting for serviceWorker.ready...');
    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] SW ready, scope:', registration.scope, 'active:', !!registration.active);

    // Check existing subscription
    const existing = await registration.pushManager.getSubscription();
    console.log('[Push] Existing subscription:', existing ? 'yes' : 'no');
    if (existing) {
      if (options.forceRefresh) {
        console.log('[Push] Force refreshing existing subscription');
        try {
          await removeSubscription(existing);
        } catch (cleanupError) {
          console.warn('[Push] Failed to remove old subscription from DB:', cleanupError);
        }

        try {
          await existing.unsubscribe();
        } catch (unsubscribeError) {
          console.warn('[Push] Failed to unsubscribe existing push subscription:', unsubscribeError);
        }
      } else {
        await saveSubscription(existing);
        return existing;
      }
    }

    const appServerKey = urlBase64ToUint8Array(key);
    console.log('[Push] applicationServerKey length:', appServerKey.length);

    let subscription: PushSubscription;
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });
    } catch (subscribeError) {
      console.warn('[Push] Initial subscribe attempt failed, retrying with clean state:', subscribeError);

      const staleSubscription = await registration.pushManager.getSubscription();
      if (staleSubscription) {
        try {
          await staleSubscription.unsubscribe();
        } catch (unsubscribeError) {
          console.warn('[Push] Failed to clear stale subscription before retry:', unsubscribeError);
        }
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });
    }

    console.log('[Push] Subscription created:', subscription.endpoint);
    await saveSubscription(subscription);
    return subscription;
  } catch (err: any) {
    console.error("[Push] Subscribe failed:", err);
    console.error("[Push] Error name:", err?.name, "message:", err?.message);
    // Re-throw so callers can access the actual error message
    throw err;
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

  const { error } = await supabase.from("push_subscriptions" as any).upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys?.p256dh,
      auth: sub.keys?.auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error('[Push] Failed to save subscription:', error);
    throw error;
  }
}

async function removeSubscription(subscription: PushSubscription) {
  const sub = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions" as any).delete().eq("endpoint", sub.endpoint);

  if (error) {
    console.error('[Push] Failed to remove subscription:', error);
    throw error;
  }
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
