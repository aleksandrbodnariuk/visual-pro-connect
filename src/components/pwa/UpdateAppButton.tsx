import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

  const handleUpdate = async () => {
    setUpdating(true);
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

      // 3. Hard reload
      setTimeout(() => {
        window.location.reload();
      }, 400);
    } catch (err) {
      console.error("[UpdateApp] error:", err);
      toast.error("Не вдалося оновити. Спробуйте ще раз.");
      setUpdating(false);
    }
  };

  return (
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
  );
}