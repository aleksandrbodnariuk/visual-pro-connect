// Captures the browser's install event globally so any button can trigger it later.
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    try { localStorage.setItem("pwa-installed", "true"); } catch { /* ignore */ }
    notify();
  });
}

export const getInstallPrompt = () => deferred;
export const clearInstallPrompt = () => { deferred = null; notify(); };
export const subscribeInstallPrompt = (fn: () => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true);
