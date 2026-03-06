import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateAppBadge } from '@/lib/badgeApi';
import { supabase } from '@/integrations/supabase/client';

/**
 * Syncs the app badge with the REAL unread count when the app becomes visible.
 * Does NOT blindly clear — updates with actual unread messages + notifications.
 */
export function useBadgeClear() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const syncBadgeWithRealCount = async () => {
      try {
        const [msgRes, notifRes] = await Promise.all([
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', user.id)
            .eq('read', false),
          supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false),
        ]);

        const msgCount = (!msgRes.error && msgRes.count !== null) ? msgRes.count : 0;
        const notifCount = (!notifRes.error && notifRes.count !== null) ? notifRes.count : 0;
        await updateAppBadge(msgCount + notifCount);
      } catch {
        // silently fail
      }
    };

    // Sync on initial load
    syncBadgeWithRealCount();

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
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);
}
