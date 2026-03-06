import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// ── Register Service Worker with auto-update ────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[PWA] SW registered:', registration.scope);

      // Check for updates periodically (every 60 seconds)
      setInterval(() => {
        registration.update();
      }, 60 * 1000);

      // Listen for new SW waiting
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            console.log('[PWA] New version activated');
          }
        });
      });
    } catch (err) {
      console.warn('[PWA] SW registration failed:', err);
    }
  });

  // Auto-reload when a new SW takes control (after skipWaiting + clients.claim)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    console.log('[PWA] Controller changed, reloading for update...');
    window.location.reload();
  });

  // Listen for push messages forwarded from SW
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'PUSH_RECEIVED') {
      // Play notification sound when push arrives while app is open
      import('./lib/sounds').then(({ playNotificationSound }) => {
        playNotificationSound();
      });
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
