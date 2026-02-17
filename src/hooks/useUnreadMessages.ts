
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchWithTimeout } from "@/lib/utils";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── Singleton state shared across all hook instances ──
let sharedChannel: RealtimeChannel | null = null;
let sharedUserId: string | null = null;
let subscriberCount = 0;
const listeners = new Set<(uid: string) => void>();

function createSharedChannel(uid: string) {
  if (sharedChannel) return;
  sharedUserId = uid;

  sharedChannel = supabase
    .channel('unread-messages-singleton')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${uid}`,
      },
      () => {
        // Notify every hook instance
        listeners.forEach(fn => fn(uid));
        // Broadcast to other parts of the app (Messages page, etc.)
        window.dispatchEvent(new CustomEvent('new-message-received'));
      }
    )
    .subscribe();
}

function destroySharedChannel() {
  if (sharedChannel) {
    supabase.removeChannel(sharedChannel);
    sharedChannel = null;
    sharedUserId = null;
  }
}

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async (uid: string) => {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', uid)
      .eq('read', false);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  }, []);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await fetchWithTimeout(
          supabase.auth.getSession(),
          10000
        );
        if (session?.user?.id) {
          setUserId(session.user.id);
          fetchUnreadCount(session.user.id);
        }
      } catch {
        console.warn('Unread messages: session timeout');
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
        fetchUnreadCount(session.user.id);
      } else {
        setUserId(null);
        setUnreadCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUnreadCount]);

  // ── Singleton Realtime subscription ──
  useEffect(() => {
    if (!userId) return;

    // Register this instance's listener
    const listener = (uid: string) => fetchUnreadCount(uid);
    listeners.add(listener);
    subscriberCount++;

    // Create the shared channel only once
    if (subscriberCount === 1 || sharedUserId !== userId) {
      destroySharedChannel();
      createSharedChannel(userId);
    }

    return () => {
      listeners.delete(listener);
      subscriberCount--;
      if (subscriberCount === 0) {
        destroySharedChannel();
      }
    };
  }, [userId, fetchUnreadCount]);

  // Слухаємо кастомну подію для примусового оновлення лічильника
  useEffect(() => {
    const handleMessagesRead = () => {
      if (userId) {
        fetchUnreadCount(userId);
      }
    };

    window.addEventListener('messages-read', handleMessagesRead);
    return () => window.removeEventListener('messages-read', handleMessagesRead);
  }, [userId, fetchUnreadCount]);

  return { unreadCount, refreshUnreadCount: () => userId && fetchUnreadCount(userId) };
}
