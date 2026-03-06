/**
 * App Badge API utility
 * Manages the badge counter on the PWA app icon (like Telegram, Instagram)
 * Uses Navigator Badge API + localStorage persistence
 */

const BADGE_KEY = 'app_badge_count';

/** Check if Badge API is supported */
export function isBadgeSupported(): boolean {
  return 'setAppBadge' in navigator;
}

/** Get current badge count from localStorage */
export function getBadgeCount(): number {
  try {
    return parseInt(localStorage.getItem(BADGE_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

/** Save badge count to localStorage */
function saveBadgeCount(count: number): void {
  try {
    localStorage.setItem(BADGE_KEY, String(Math.max(0, count)));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Update the app badge with a specific count
 * Combines unread messages + unread notifications
 */
export async function updateAppBadge(count: number): Promise<void> {
  const safeCount = Math.max(0, count);
  saveBadgeCount(safeCount);

  if (!isBadgeSupported()) return;

  try {
    if (safeCount > 0) {
      await (navigator as any).setAppBadge(safeCount);
    } else {
      await (navigator as any).clearAppBadge();
    }
  } catch (err) {
    console.warn('[Badge] Failed to update app badge:', err);
  }
}

/**
 * Clear the app badge entirely (when user opens the app)
 */
export async function clearAppBadge(): Promise<void> {
  saveBadgeCount(0);

  if (!isBadgeSupported()) return;

  try {
    await (navigator as any).clearAppBadge();
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
