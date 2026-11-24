import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export const APK_SETTING_KEYS = { url: "android-apk-url", path: "android-apk-path", version: "android-apk-version", build: "android-apk-build", size: "android-apk-size" } as const;

export interface ApkInfo { url: string; path: string; version: string; build: string; sizeMb: string }

export const DEFAULT_APK: ApkInfo = {
  url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/android-release`,
  path: "system/initial-spilnota-bc.apk",
  version: "1.0",
  build: "1",
  sizeMb: "7.7",
};

export async function loadApkInfo(): Promise<ApkInfo> {
  const { data, error } = await supabase.from("site_settings").select("id, value").in("id", Object.values(APK_SETTING_KEYS));
  if (error) throw error;
  const map = Object.fromEntries((data || []).map((r) => [r.id, r.value]));
  return {
    url: DEFAULT_APK.url,
    path: map[APK_SETTING_KEYS.path] || DEFAULT_APK.path,
    version: map[APK_SETTING_KEYS.version] || DEFAULT_APK.version,
    build: map[APK_SETTING_KEYS.build] || DEFAULT_APK.build,
    sizeMb: map[APK_SETTING_KEYS.size] || DEFAULT_APK.sizeMb,
  };
}

export const isAndroid = () => typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

export const isNativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export async function downloadAndroidApk(): Promise<void> {
  const url = `${DEFAULT_APK.url}?t=${Date.now()}`;
  if (isNativeAndroid() && Capacitor.isPluginAvailable("Browser")) {
    await Browser.open({ url });
  } else if (isNativeAndroid()) {
    window.open(url, "_system");
  } else {
    window.location.assign(url);
  }
}
