import { supabase } from "@/integrations/supabase/client";
import bundledApk from "@/assets/spilnota-bc.apk.asset.json";

export const APK_SETTING_KEYS = { url: "android-apk-url", version: "android-apk-version", size: "android-apk-size" } as const;

export interface ApkInfo { url: string; version: string; sizeMb: string }

export const DEFAULT_APK: ApkInfo = {
  url: bundledApk.url,
  version: "1.0",
  sizeMb: (bundledApk.size / 1024 / 1024).toFixed(1),
};

export async function loadApkInfo(): Promise<ApkInfo> {
  const { data } = await supabase.from("site_settings").select("id, value").in("id", Object.values(APK_SETTING_KEYS));
  const map = Object.fromEntries((data || []).map((r: any) => [r.id, r.value]));
  return {
    url: map[APK_SETTING_KEYS.url] || DEFAULT_APK.url,
    version: map[APK_SETTING_KEYS.version] || DEFAULT_APK.version,
    sizeMb: map[APK_SETTING_KEYS.size] || DEFAULT_APK.sizeMb,
  };
}

export const isAndroid = () => typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
