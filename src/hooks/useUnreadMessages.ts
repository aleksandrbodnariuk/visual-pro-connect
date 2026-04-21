
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { updateAppBadge } from "@/lib/badgeApi";
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

// Reconnection state
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const RECONNECT_DELAY = 3000;

// Polling state
let pollInterval: ReturnType<typeof setInterval> | null = null;
const POLL_INTERVAL = 30_000; // 30 seconds

function startPolling(uid: string) {
  stopPolling();
  pollInterval = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    console.log('[Unread] Polling fallback triggered');
    cachedCount = null;
    initialFetchPromise = null;
    listeners.forEach(fn => fn(uid));
  }, POLL_INTERVAL);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function createSharedChannel(uid: string) {
  if (sharedChannel) return;
  sharedUserId = uid;

  console.log('[Unread] Creating singleton Realtime channel for', uid);

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
        console.log('[Unread] Realtime event received — refreshing count');
        cachedCount = null;
        initialFetchPromise = null;
        listeners.forEach(fn => fn(uid));
        window.dispatchEvent(new CustomEvent('new-message-received'));
      }
    )
    .subscribe((status, err) => {
      console.log('[Unread] Channel status:', status, err || '');
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[Unread] Channel error/timeout — scheduling reconnect');
        scheduleReconnect(uid);
      }
    });

  // Start polling as a safety net
  startPolling(uid);
}

function scheduleReconnect(uid: string) {
  if (reconnectTimer) return; // already scheduled
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    console.log('[Unread] Attempting reconnect...');
    destroySharedChannel();
    if (subscriberCount > 0) {
      createSharedChannel(uid);
    }
  }, RECONNECT_DELAY);
}

function destroySharedChannel() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  stopPolling();
  if (sharedChannel) {
    console.log('[Unread] Destroying singleton channel');
    supabase.removeChannel(sharedChannel);
    sharedChannel = null;
    sharedUserId = null;
  }
}

async function fetchUnreadFromDb(uid: string): Promise<number> {
  // Sum unread_count across all the user's conversations (covers both direct + group chats).
  const { data, error } = await supabase
    .rpc('get_user_conversations', { _user_id: uid });
  if (error || !data) {
    console.warn('[Unread] Failed to fetch unread count:', error?.message);
    return 0;
  }
  let total = 0;
  for (const row of data as any[]) {
    total += Number(row.unread_count || 0);
  }
  return total;
}

async function fetchUnreadNotifications(uid: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', uid)
    .eq('is_read', false);
  return (!error && count !== null) ? count : 0;
}

async function updateBadgeWithTotalCount(uid: string, messageCount: number) {
  try {
    const notifCount = await fetchUnreadNotifications(uid);
    const total = messageCount + notifCount;
    console.log('[Unread] Badge update — msgs:', messageCount, 'notifs:', notifCount, 'total:', total);
    await updateAppBadge(total);
  } catch {
    await updateAppBadge(messageCount);
  }
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
    updateBadgeWithTotalCount(uid, count);
  }, []);

  // Initial fetch — deduplicated via module-level promise
  useEffect(() => {
    if (!userId) return;

    if (cachedCount !== null && cachedForUserId === userId) {
      setUnreadCount(cachedCount);
      return;
    }

    if (!initialFetchPromise || cachedForUserId !== userId) {
      initialFetchPromise = fetchUnreadFromDb(userId);
      cachedForUserId = userId;
    }

    initialFetchPromise.then(count => {
      cachedCount = count;
      setUnreadCount(count);
      updateBadgeWithTotalCount(userId, count);
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

  // Reconnect channel when app becomes visible
  useEffect(() => {
    if (!userId) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && subscriberCount > 0) {
        // Check if channel is still healthy
        const state = sharedChannel?.state;
        if (!sharedChannel || (state !== 'joined' && state !== 'joining')) {
          console.log('[Unread] App visible — channel state:', state, '— reconnecting');
          destroySharedChannel();
          createSharedChannel(userId);
        }
        // Also refresh count on visibility
        cachedCount = null;
        initialFetchPromise = null;
        fetchUnreadCount(userId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
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

  // Listen for notification changes to update badge
  useEffect(() => {
    if (!userId) return;

    const handleNotificationChange = () => {
      if (cachedCount !== null) {
        updateBadgeWithTotalCount(userId, cachedCount);
      }
    };

    window.addEventListener('notifications-updated', handleNotificationChange);
    return () => window.removeEventListener('notifications-updated', handleNotificationChange);
  }, [userId]);

  return { unreadCount, refreshUnreadCount: () => userId && fetchUnreadCount(userId) };
}
