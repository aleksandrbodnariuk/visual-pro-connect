import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const HEARTBEAT_INTERVAL = 30 * 1000; // Update last_seen every 30 seconds

export function useVisitTracker() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const userId = user.id;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    const updateLastSeen = async () => {
      if (!mounted) return;
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

    // Visit recording removed — analytics now handled by collect-analytics Edge Function

    // Start heartbeat to keep last_seen fresh
    startHeartbeat();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      stopHeartbeat();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);
}
