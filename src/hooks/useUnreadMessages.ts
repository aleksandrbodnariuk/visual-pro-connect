
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchWithTimeout } from "@/lib/utils";

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  // Унікальний ID для цієї інстанції хука, щоб уникнути конфліктів каналів
  const instanceId = useRef(`unread-messages-${Math.random().toString(36).substring(7)}`);

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

  // Підписка на realtime зміни повідомлень
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(instanceId.current)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          fetchUnreadCount(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
