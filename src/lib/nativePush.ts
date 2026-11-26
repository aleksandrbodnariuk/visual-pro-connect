import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/**
 * Native (Capacitor) push registration. Driven by auth state from AuthContext:
 * call `registerNativePush(userId)` after sign-in, `unregisterNativePush()` on sign-out.
 * Badge numbers come from FCM (`notification_count`) when the app is closed, and
 * from the shared unread counters (badgeApi) while it is open.
 */
let listenersReady = false;
let currentUserId: string | null = null;
let currentToken: string | null = null;

async function saveToken(token: string) {
  currentToken = token;
  if (!currentUserId) return;
  const { error } = await supabase.from("device_tokens").upsert(
    { user_id: currentUserId, token, platform: Capacitor.getPlatform(), updated_at: new Date().toISOString() },
    { onConflict: "user_id,token" },
  );
  if (error) console.warn("[NativePush] token save failed", error.message);
}

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function registerNativePush(userId: string) {
  if (!isNativeApp()) return;
  currentUserId = userId;
  const { PushNotifications } = await import("@capacitor/push-notifications");

  if (!listenersReady) {
    listenersReady = true;
    await PushNotifications.addListener("registration", (t) => { void saveToken(t.value); });
    await PushNotifications.addListener("registrationError", (e) =>
      console.warn("[NativePush] registration error", e));
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const url = (action.notification?.data as any)?.url;
      if (typeof url === "string" && url.startsWith("/")) window.location.assign(url);
    });
  }

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== "granted") return;

  // Channel with high importance so calls/messages show as heads-up and in background.
  if (Capacitor.getPlatform() === "android") {
    try {
      await PushNotifications.createChannel({
        id: "messages", name: "Повідомлення", importance: 5, visibility: 1, sound: "default", vibration: true,
      });
      await PushNotifications.createChannel({
        id: "calls", name: "Дзвінки", importance: 5, visibility: 1, sound: "default", vibration: true,
      });
    } catch { /* older Android */ }
  }

  await PushNotifications.register();
  if (currentToken) void saveToken(currentToken);
}

export async function unregisterNativePush() {
  if (!isNativeApp()) return;
  const uid = currentUserId;
  const token = currentToken;
  currentUserId = null;
  if (uid && token) {
    await supabase.from("device_tokens").delete().eq("user_id", uid).eq("token", token);
  }
}
