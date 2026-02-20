import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const HEARTBEAT_INTERVAL = 30 * 1000; // Update last_seen every 30 seconds

export function useVisitTracker() {
  useEffect(() => {
    let userId: string | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    const updateLastSeen = async () => {
      if (!userId) return;
      try {
        await supabase
          .from('users')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', userId);
      } catch {
        // Silently fail
      }
    };

    const startHeartbeat = () => {
      updateLastSeen();
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(updateLastSeen, HEARTBEAT_INTERVAL);
    };

    const stopHeartbeat = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    };

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;
        userId = user.id;

        // Record visit (for stats)
        await supabase.rpc('record_visit');

        // Start heartbeat to keep last_seen fresh
        startHeartbeat();

        document.addEventListener('visibilitychange', handleVisibilityChange);
      } catch {
        // Not logged in or error
      }
    };

    init();

    return () => {
      mounted = false;
      stopHeartbeat();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
