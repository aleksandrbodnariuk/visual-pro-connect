const CACHE_VERSION = 'bc-v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const OFFLINE_URL = '/';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/site.webmanifest',
];

// Max cache sizes
const MAX_IMAGE_CACHE = 100;
const MAX_API_CACHE = 50;

// Badge counter stored in SW scope
let badgeCount = 0;

// ── Install ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate — clean old caches ─────────────────────────
self.addEventListener('activate', (event) => {
  const validCaches = [STATIC_CACHE, IMAGE_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Helper: trim cache to max entries ───────────────────
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await Promise.all(keys.slice(0, keys.length - maxItems).map((k) => cache.delete(k)));
  }
}

// ── Fetch ───────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Skip Supabase realtime / auth requests
  if (url.pathname.startsWith('/auth/') || url.href.includes('realtime')) return;

  // 1) SPA navigation — network first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match('/index.html').then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // 2) Images — cache first, network fallback
  if (
    request.destination === 'image' ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              if (response.ok) {
                cache.put(request, response.clone());
                trimCache(IMAGE_CACHE, MAX_IMAGE_CACHE);
              }
              return response;
            })
        )
      )
    );
    return;
  }

  // 3) Supabase REST API (read-only) — network first, stale fallback
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, clone);
              trimCache(API_CACHE, MAX_API_CACHE);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 4) Static assets (JS, CSS, fonts) — network first, cache fallback
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'document'
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }
});

// ── Push Notifications ──────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Спільнота B&C', body: 'Нове повідомлення', url: '/' };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  // Increment badge counter
  badgeCount++;

  const options = {
    body: data.body,
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    vibrate: [100, 50, 100],
    tag: data.tag || 'default',
    renotify: !!data.tag,
    data: { url: data.url || '/' },
    actions: data.actions || [],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      // Update app badge if supported
      self.registration.setAppBadge
        ? self.registration.setAppBadge(badgeCount).catch(() => {})
        : Promise.resolve(),
    ])
  );
});

// ── Notification Click ──────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  // Clear badge when user taps notification
  badgeCount = 0;
  if (self.registration.clearAppBadge) {
    self.registration.clearAppBadge().catch(() => {});
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if found
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(targetUrl);
    })
  );
});

// ── Message from client to manage badge ─────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_BADGE') {
    badgeCount = event.data.count || 0;
    if (self.registration.setAppBadge && badgeCount > 0) {
      self.registration.setAppBadge(badgeCount).catch(() => {});
    } else if (self.registration.clearAppBadge && badgeCount === 0) {
      self.registration.clearAppBadge().catch(() => {});
    }
  }

  if (event.data && event.data.type === 'CLEAR_BADGE') {
    badgeCount = 0;
    if (self.registration.clearAppBadge) {
      self.registration.clearAppBadge().catch(() => {});
    }
  }
});
