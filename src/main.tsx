import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const isProd = import.meta.env.PROD;

if ("serviceWorker" in navigator) {
  if (isProd) {
    // ── Register Service Worker with auto-update (production only) ────────────
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        console.log("[PWA] SW registered:", registration.scope);

        setInterval(() => {
          registration.update();
        }, 60 * 1000);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "activated") {
              console.log("[PWA] New version activated");
            }
          });
        });
      } catch (err) {
        console.warn("[PWA] SW registration failed:", err);
      }
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      console.log("[PWA] Controller changed, reloading for update...");
      window.location.reload();
    });

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "PUSH_RECEIVED") {
        import("./lib/sounds").then(({ playNotificationSound }) => {
          playNotificationSound();
        });
      }
    });
  } else {
    // Preview/dev: avoid stale chunk cache causing invalid hook call
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });

    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <App />
);

