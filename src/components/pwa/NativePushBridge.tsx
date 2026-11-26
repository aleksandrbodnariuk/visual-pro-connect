import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { registerNativePush, unregisterNativePush, isNativeApp } from "@/lib/nativePush";

/** Connects native push registration to the signed-in user (no-op on the web). */
export function NativePushBridge() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!isNativeApp()) return;
    if (userId) registerNativePush(userId).catch((e) => console.warn("[NativePush]", e));
    else unregisterNativePush().catch(() => {});
  }, [userId]);
  return null;
}
