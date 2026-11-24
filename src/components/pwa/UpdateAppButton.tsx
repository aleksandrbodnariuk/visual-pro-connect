import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { downloadAndroidApk, isNativeAndroid, loadApkInfo, type ApkInfo } from "@/lib/androidApk";
import { needsAndroidUpdate } from "@/lib/androidRelease";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface UpdateAppButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

/**
 * Forces the PWA to update: unregisters old service workers,
 * clears caches, and reloads the app with cache bypass.
 */
export function UpdateAppButton({
  variant = "outline",
  size = "default",
  className,
  showLabel = true,
}: UpdateAppButtonProps) {
  const [updating, setUpdating] = useState(false);
  const [release, setRelease] = useState<ApkInfo | null>(null);
  const [installed, setInstalled] = useState<string | null>(null);

  const handleUpdate = async () => {
    setUpdating(true);
    if (isNativeAndroid()) {
      try {
        const latest = await loadApkInfo();
        if (Capacitor.isPluginAvailable("App")) {
          const current = await App.getInfo();
          if (!needsAndroidUpdate(current.build, latest.build)) {
            toast.success(`Встановлено актуальну версію ${current.version}`);
            return;
          }
          setInstalled(current.version);
        } else {
          setInstalled(null);
        }
        setRelease(latest);
      } catch {
        toast.error("Не вдалося перевірити оновлення. Спробуйте ще раз.");
      } finally { setUpdating(false); }
      return;
    }
    toast.info("Оновлюємо застосунок...");

    try {
      // 1. Tell SW to skip waiting & take control of the new version
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          try {
            await reg.update();
            if (reg.waiting) {
              reg.waiting.postMessage({ type: "SKIP_WAITING" });
            }
            await reg.unregister();
          } catch (e) {
            console.warn("[UpdateApp] update failed", e);
          }
        }
      }

      // 2. Clear all caches
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }

      // 3. Reload bypassing browser HTTP cache (plain reload() can reuse stale HTML in some browsers, e.g. Avast)
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set("updated", String(Date.now()));
        window.location.replace(url.toString());
      }, 400);
    } catch (err) {
      console.error("[UpdateApp] error:", err);
      toast.error("Не вдалося оновити. Спробуйте ще раз.");
      setUpdating(false);
    }
  };

  return (
    <>
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleUpdate}
      disabled={updating}
    >
      {updating ? (
        <Loader2 className={showLabel ? "mr-2 h-4 w-4 animate-spin" : "h-4 w-4 animate-spin"} />
      ) : (
        <RefreshCw className={showLabel ? "mr-2 h-4 w-4" : "h-4 w-4"} />
      )}
      {showLabel && (updating ? "Оновлюємо…" : "Оновити застосунок")}
    </Button>
    <Dialog open={Boolean(release)} onOpenChange={(open) => { if (!open) setRelease(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Оновлення Android-застосунку</DialogTitle>
          <DialogDescription>Доступна версія {release?.version} · {release?.sizeMb} МБ{installed ? ` · встановлено ${installed}` : " · встановлену версію не вдалося визначити"}</DialogDescription>
        </DialogHeader>
        <p className="text-sm">Завантажте файл, відкрийте його в «Завантаженнях» і натисніть «Оновити». Не видаляйте поточний застосунок. Встановлення потребує вашого підтвердження на телефоні.</p>
        <Button onClick={() => downloadAndroidApk().catch(() => toast.error("Не вдалося відкрити завантаження"))}>Завантажити оновлення для Android</Button>
      </DialogContent>
    </Dialog>
    </>
  );
}