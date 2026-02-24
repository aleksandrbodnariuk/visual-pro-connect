
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── Singleton state shared across all hook instances ──
let sharedChannel: RealtimeChannel | null = null;
let sharedUserId: string | null = null;
let subscriberCount = 0;
const listeners = new Set<(uid: string) => void>();

// Module-level cache for initial fetch deduplication
let initialFetchPromise: Promise<number> | null = null;
let cachedCount: number | null = null;
let cachedForUserId: string | null = null;

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
        // Invalidate cache on new message
        cachedCount = null;
        initialFetchPromise = null;
        listeners.forEach(fn => fn(uid));
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

async function fetchUnreadFromDb(uid: string): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', uid)
    .eq('read', false);
  return (!error && count !== null) ? count : 0;
}

export function useUnreadMessages() {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async (uid: string) => {
    const count = await fetchUnreadFromDb(uid);
    cachedCount = count;
    cachedForUserId = uid;
    setUnreadCount(count);
  }, []);

  // Initial fetch — deduplicated via module-level promise
  useEffect(() => {
    if (!userId) return;

    // If cached for this user, use immediately
    if (cachedCount !== null && cachedForUserId === userId) {
      setUnreadCount(cachedCount);
      return;
    }

    // Deduplicate: only one in-flight request at a time
    if (!initialFetchPromise || cachedForUserId !== userId) {
      initialFetchPromise = fetchUnreadFromDb(userId);
      cachedForUserId = userId;
    }

    initialFetchPromise.then(count => {
      cachedCount = count;
      setUnreadCount(count);
    });
  }, [userId]);

  // ── Singleton Realtime subscription ──
  useEffect(() => {
    if (!userId) return;

    const listener = (uid: string) => fetchUnreadCount(uid);
    listeners.add(listener);
    subscriberCount++;

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

  // Listen for messages-read events
  useEffect(() => {
    const handleMessagesRead = () => {
      if (userId) {
        cachedCount = null;
        initialFetchPromise = null;
        fetchUnreadCount(userId);
      }
    };

    window.addEventListener('messages-read', handleMessagesRead);
    return () => window.removeEventListener('messages-read', handleMessagesRead);
  }, [userId, fetchUnreadCount]);

  return { unreadCount, refreshUnreadCount: () => userId && fetchUnreadCount(userId) };
}
