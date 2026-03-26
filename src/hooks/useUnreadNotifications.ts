import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useUnreadNotifications() {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!userId) return;
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (!error) setUnreadCount(count ?? 0);
  }, [userId]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Listen for realtime changes
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('unread-notifications-badge')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => fetchCount())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchCount]);

  // Listen for custom event from Notifications page
  useEffect(() => {
    const handler = () => fetchCount();
    window.addEventListener('notifications-updated', handler);
    return () => window.removeEventListener('notifications-updated', handler);
  }, [fetchCount]);

  return { unreadCount, refreshCount: fetchCount };
}
