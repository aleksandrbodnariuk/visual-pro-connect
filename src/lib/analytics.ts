/**
 * Self-hosted analytics tracker.
 * - Non-blocking (sendBeacon / fetch keepalive)
 * - Deduplication (same path within 30s ignored)
 * - Anonymous visitor_id (localStorage UUID)
 * - Session management (30 min inactivity = new session)
 * - Sends to Supabase Edge Function (NOT /api/*)
 */

const DEDUP_INTERVAL = 30_000; // 30 seconds
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cxdkaxjeibqdmpvozirz.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZGtheGplaWJxZG1wdm96aXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MzUxMzcsImV4cCI6MjA2MDQxMTEzN30.mjqEyiJX59YLQpjb-_N4qS_3byUY_zpgS2g6X5xqM2U';
const COLLECT_URL = `${SUPABASE_URL}/functions/v1/collect-analytics`;

const isDev = import.meta.env.DEV;

let lastPath = '';
let lastTime = 0;
let eventQueue: any[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function getVisitorId(): string {
  const key = '_a_vid';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function getSessionId(): string {
  const key = '_a_sid';
  const tsKey = '_a_sid_ts';
  const now = Date.now();
  const lastTs = Number(sessionStorage.getItem(tsKey) || '0');
  let sid = sessionStorage.getItem(key);

  if (!sid || now - lastTs > SESSION_TIMEOUT) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(key, sid);
  }
  sessionStorage.setItem(tsKey, String(now));
  return sid;
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getUtmParams(): Record<string, string | null> {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
  };
}

function flush() {
  if (eventQueue.length === 0) return;
  const batch = eventQueue.splice(0, 20);
  const payload = JSON.stringify(batch);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };

  if (navigator.sendBeacon) {
    // sendBeacon doesn't support custom headers, use fetch with keepalive instead
    fetch(COLLECT_URL, {
      method: 'POST',
      body: payload,
      headers,
      keepalive: true,
    }).then(async (res) => {
      if (isDev) {
        try {
          const data = await res.json();
          console.log('[Analytics] collect response:', data);
        } catch { /* ignore */ }
      }
    }).catch((err) => {
      if (isDev) console.warn('[Analytics] collect error:', err);
    });
  } else {
    fetch(COLLECT_URL, {
      method: 'POST',
      body: payload,
      headers,
      keepalive: true,
    }).catch(() => {});
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 2000);
}

export function trackPageView(path?: string) {
  const currentPath = path || window.location.pathname;
  const now = Date.now();

  // Deduplication - 30s
  if (currentPath === lastPath && now - lastTime < DEDUP_INTERVAL) {
    return;
  }
  lastPath = currentPath;
  lastTime = now;

  const utm = getUtmParams();

  eventQueue.push({
    event_type: 'page_view',
    path: currentPath,
    referrer: document.referrer || null,
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    device_type: getDeviceType(),
    language: navigator.language?.slice(0, 10) || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    occurred_at: new Date().toISOString(),
    ...utm,
  });

  if (isDev) {
    console.log('[Analytics] tracked page_view:', currentPath);
  }

  scheduleFlush();
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush();
    }
  });
  window.addEventListener('pagehide', flush);
}
