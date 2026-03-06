import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
} from '@/lib/pushNotifications';

/**
 * Auto-subscribes the user to push notifications if they previously granted permission.
 * Does NOT prompt for permission — only re-subscribes silently.
 */
export function usePushAutoSubscribe() {
  const { user } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (!user || attempted.current) return;
    if (!isPushSupported()) return;
    if (getNotificationPermission() !== 'granted') return;

    attempted.current = true;

    // Silently re-subscribe (e.g., after SW update or new device login)
    subscribeToPush().catch((err) => {
      console.warn('[Push] Auto-subscribe failed:', err);
    });
  }, [user]);
}
