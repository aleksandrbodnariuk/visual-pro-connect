import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateAppBadge } from '@/lib/badgeApi';
import { supabase } from '@/integrations/supabase/client';
import { fetchUnreadFromDb } from '@/hooks/useUnreadMessages';

/**
 * Syncs the app badge with the REAL unread count when the app becomes visible.
 * Waits for auth session to be confirmed before querying to avoid RLS returning 0.
 */
export function useBadgeClear() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const syncBadgeWithRealCount = async () => {
      try {
        // Verify session is active before querying (RLS guard)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('[Badge] No active session — skipping badge sync');
          return;
        }

        const [msgCount, notifRes] = await Promise.all([
          fetchUnreadFromDb(user.id),
          supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false),
        ]);

        const notifCount = (!notifRes.error && notifRes.count !== null) ? notifRes.count : 0;
        const total = msgCount + notifCount;
        console.log('[Badge] Sync — msgs:', msgCount, 'notifs:', notifCount, 'total:', total);
        await updateAppBadge(total);
      } catch {
        // silently fail
      }
    };

    // Delay initial sync to let auth fully settle
    const initTimer = setTimeout(syncBadgeWithRealCount, 800);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncBadgeWithRealCount();
      }
    };

    const handleFocus = () => {
      syncBadgeWithRealCount();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(initTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);
}
