
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const HEARTBEAT_INTERVAL = 30 * 1000; // Update last_seen every 30 seconds
const VISIT_RECORD_INTERVAL = 30 * 60 * 1000; // Record visit every 30 minutes

export function useVisitTracker() {
  const userIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastVisitRecordedRef = useRef<number>(0);

  const updateLastSeen = async (userId: string) => {
    try {
      await supabase
        .from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      // Silently fail — not critical
    }
  };

  const recordVisitIfNeeded = async () => {
    const now = Date.now();
    if (now - lastVisitRecordedRef.current < VISIT_RECORD_INTERVAL) return;
    try {
      await supabase.rpc('record_visit');
      lastVisitRecordedRef.current = now;
    } catch (error) {
      // Silently fail
    }
  };

  const startHeartbeat = (userId: string) => {
    if (heartbeatRef.current) return; // Already running

    // Update immediately on start
    updateLastSeen(userId);
    recordVisitIfNeeded();
    lastVisitRecordedRef.current = Date.now();

    heartbeatRef.current = setInterval(() => {
      updateLastSeen(userId);
      recordVisitIfNeeded();
    }, HEARTBEAT_INTERVAL);
  };

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;
        userIdRef.current = user.id;
        startHeartbeat(user.id);
      } catch (error) {
        // Not logged in
      }
    };

    init();

    // Handle visibility changes — pause when tab is hidden, resume when visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userIdRef.current) {
        // Update immediately when user comes back to the tab
        updateLastSeen(userIdRef.current);
        if (!heartbeatRef.current) {
          startHeartbeat(userIdRef.current);
        }
      } else if (document.visibilityState === 'hidden') {
        stopHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      stopHeartbeat();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
