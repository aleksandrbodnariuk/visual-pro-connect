import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { clearAppBadge } from '@/lib/badgeApi';

/**
 * Clears the app badge when the app becomes visible (user opens/focuses the PWA).
 * This ensures the badge icon disappears after the user enters the app.
 */
export function useBadgeClear() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Clear badge on initial load
    clearAppBadge();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        clearAppBadge();
      }
    };

    const handleFocus = () => {
      clearAppBadge();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);
}
