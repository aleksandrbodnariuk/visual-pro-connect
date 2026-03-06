import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
} from '@/lib/pushNotifications';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * Auto-subscribes the user to push notifications if they previously granted permission.
 * Does NOT prompt for permission — only re-subscribes silently.
 */
export function usePushAutoSubscribe() {
  const { user } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (!user || attempted.current || !VAPID_PUBLIC_KEY) return;
    if (!isPushSupported()) return;
    if (getNotificationPermission() !== 'granted') return;

    attempted.current = true;

    // Silently re-subscribe (e.g., after SW update or new device login)
    subscribeToPush(VAPID_PUBLIC_KEY).catch((err) => {
      console.warn('[Push] Auto-subscribe failed:', err);
    });
  }, [user]);
}
