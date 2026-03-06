/**
 * Self-hosted analytics tracker.
 * - Non-blocking (sendBeacon / fetch keepalive)
 * - Deduplication (same path within 15s ignored)
 * - Anonymous visitor_id (localStorage UUID)
 * - Session management (30 min inactivity = new session)
 */

const DEDUP_INTERVAL = 15_000; // 15 seconds
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const COLLECT_URL = `https://cxdkaxjeibqdmpvozirz.supabase.co/functions/v1/collect-analytics`;

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

  if (navigator.sendBeacon) {
    navigator.sendBeacon(COLLECT_URL, payload);
  } else {
    fetch(COLLECT_URL, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
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

  // Deduplication
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
