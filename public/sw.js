const CACHE_VERSION = 'bc-v3';
const STATIC_CACHE = `bc-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `bc-images-${CACHE_VERSION}`;
const API_CACHE = `bc-api-${CACHE_VERSION}`;
const OFFLINE_URL = '/';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/manifest.json',
  '/sounds/notification.mp3',
];

// Max cache sizes
const MAX_IMAGE_CACHE = 100;
const MAX_API_CACHE = 50;

// ── Install — precache static assets ────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate — clean old caches, claim clients ──────────
self.addEventListener('activate', (event) => {
  const validCaches = [STATIC_CACHE, IMAGE_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      return self.clients.claim();
    })
  );
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

  if (url.pathname.startsWith('/auth/') || url.href.includes('realtime')) return;

  // 1) SPA navigation
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

  // 2) Images
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

  // 3) Supabase REST API
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

  // 4) Static assets
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'audio' ||
    /\.(js|css|woff2?|ttf|mp3|wav)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              if (response.ok) {
                cache.put(request, response.clone());
              }
              return response;
            }).catch(() => cached)
        )
      )
    );
    return;
  }
});

// ── Push Notifications ──────────────────────────────────
self.addEventListener('push', (event) => {
  console.log('[SW] Push received in SW at', new Date().toISOString());

  let data = { title: 'Спільнота B&C', body: 'Нове повідомлення', url: '/' };

  try {
    if (event.data) {
      const json = event.data.json();
      console.log('[SW] Push payload:', JSON.stringify(json));
      data = { ...data, ...json };
    } else {
      console.log('[SW] Push received with no data');
    }
  } catch (e) {
    console.warn('[SW] Push JSON parse failed, using text:', e);
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const badgeCount = typeof data.badgeCount === 'number' ? data.badgeCount : 1;

  const options = {
    body: data.body,
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    vibrate: [200, 100, 200],
    ...(data.tag ? { tag: data.tag, renotify: true } : {}),
    data: { url: data.url || '/' },
    actions: data.actions || [],
    silent: false,
  };

  console.log('[SW] Showing notification:', data.title, '| badge:', badgeCount);

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => {
        console.log('[SW] showNotification succeeded');
        // Set badge — safe guard for missing API
        if (typeof self.registration.setAppBadge === 'function') {
          return self.registration.setAppBadge(badgeCount).catch((err) => {
            console.warn('[SW] setAppBadge failed:', err);
          });
        }
      })
      .then(() => {
        // Notify open clients to play sound
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({ type: 'PUSH_RECEIVED', data });
        });
      })
      .catch((err) => {
        console.error('[SW] Push handling error:', err);
      })
  );
});

// ── Notification Click ──────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  // Clear badge when user taps notification
  if (self.registration.clearAppBadge) {
    self.registration.clearAppBadge().catch(() => {});
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ── Message from client to manage badge ─────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_BADGE') {
    const count = event.data.count || 0;

    if (self.registration.setAppBadge && count > 0) {
      self.registration.setAppBadge(count).catch(() => {});
    } else if (self.registration.clearAppBadge && count === 0) {
      self.registration.clearAppBadge().catch(() => {});
      // Also close active notifications so Android launcher badge doesn't stay stuck.
      self.registration.getNotifications().then((notifications) => {
        notifications.forEach((notification) => notification.close());
      }).catch(() => {});
    }
  }

  if (event.data && event.data.type === 'CLEAR_BADGE') {
    if (self.registration.clearAppBadge) {
      self.registration.clearAppBadge().catch(() => {});
    }
    // Also close active notifications so Android launcher badge doesn't stay stuck.
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((notification) => notification.close());
    }).catch(() => {});
  }
});
