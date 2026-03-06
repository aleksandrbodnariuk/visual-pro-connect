/**
 * App Badge API utility
 * Manages the badge counter on the PWA app icon
 * Uses Navigator Badge API + Service Worker sync
 */

/** Check if Badge API is supported */
export function isBadgeSupported(): boolean {
  return 'setAppBadge' in navigator;
}

/** Send message to Service Worker to sync badge */
async function syncBadgeToSW(count: number): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg?.active) {
      if (count > 0) {
        reg.active.postMessage({ type: 'SET_BADGE', count });
      } else {
        reg.active.postMessage({ type: 'CLEAR_BADGE' });
      }
    }
  } catch {
    // SW not available
  }
}

/**
 * Update the app badge with a specific count
 */
export async function updateAppBadge(count: number): Promise<void> {
  const safeCount = Math.max(0, count);

  if (!isBadgeSupported()) {
    // Still try to sync to SW for platforms that support it via SW only
    await syncBadgeToSW(safeCount);
    return;
  }

  try {
    if (safeCount > 0) {
      await (navigator as any).setAppBadge(safeCount);
    } else {
      await (navigator as any).clearAppBadge();
    }
    // Also sync to SW so it knows the current count
    await syncBadgeToSW(safeCount);
  } catch (err) {
    console.warn('[Badge] Failed to update app badge:', err);
  }
}

/**
 * Clear the app badge entirely
 */
export async function clearAppBadge(): Promise<void> {
  try {
    if (isBadgeSupported()) {
      await (navigator as any).clearAppBadge();
    }
    await syncBadgeToSW(0);
  } catch (err) {
    console.warn('[Badge] Failed to clear app badge:', err);
  }
}

/**
 * Set badge from combined counts (unread messages + unread notifications)
 */
export async function setBadgeFromCounts(
  unreadMessages: number,
  unreadNotifications: number
): Promise<void> {
  await updateAppBadge(unreadMessages + unreadNotifications);
}
