import { useState, useEffect, useCallback } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
} from "@/lib/pushNotifications";
import { useAuth } from "@/context/AuthContext";

const ONBOARDING_KEY = "push_onboarding_seen";

export function PushOnboarding() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!isPushSupported()) return;
    if (localStorage.getItem(ONBOARDING_KEY)) return;
    if (getNotificationPermission() !== "default") {
      // Already granted or denied — no need to ask
      localStorage.setItem(ONBOARDING_KEY, "true");
      return;
    }
    // Small delay so the app loads first
    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, [user]);

  const handleEnable = useCallback(async () => {
    setLoading(true);
    try {
      const permission = await requestNotificationPermission();
      if (permission === "granted") {
        await subscribeToPush();
        toast({ title: "Сповіщення увімкнено ✓", description: "Ви будете отримувати push-сповіщення." });
      }
    } catch (err) {
      console.error("[PushOnboarding] Error:", err);
    } finally {
      localStorage.setItem(ONBOARDING_KEY, "true");
      setShow(false);
      setLoading(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShow(false);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/40" onClick={handleDismiss} />
      <div className="relative bg-card border rounded-2xl p-6 shadow-2xl w-full max-w-sm animate-in slide-in-from-bottom-6 duration-400 z-10">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="h-7 w-7 text-primary" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Увімкнути сповіщення?
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Отримуйте повідомлення про нові повідомлення, коментарі та лайки навіть коли додаток закритий.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <Button onClick={handleEnable} disabled={loading} className="w-full">
              {loading ? "Підключення…" : "Увімкнути сповіщення"}
            </Button>
            <Button variant="ghost" onClick={handleDismiss} disabled={loading} className="w-full">
              Пізніше
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
