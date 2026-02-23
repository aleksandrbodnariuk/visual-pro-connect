import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchWithTimeout } from '@/lib/utils';
import { useVisitTracker } from '@/hooks/useVisitTracker';
import { useAuth } from '@/context/AuthContext';

export function useDataSync() {
  useVisitTracker();
  const { user } = useAuth();

  const syncDataOnStartup = useCallback(async () => {
    if (!user?.id) return;

    const userId = user.id;
    console.log("Синхронізація даних для користувача:", userId);

    // Синхронізуємо запити друзів
    try {
      const { data: friendRequests } = await fetchWithTimeout(
        Promise.resolve(supabase
          .from('friend_requests')
          .select('*')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)),
        10000
      );

      if (friendRequests && friendRequests.length > 0) {
        localStorage.setItem('friendRequests', JSON.stringify(friendRequests));
      }
    } catch (error) {
      console.warn("Не вдалося синхронізувати запити друзів:", error);
    }

    // Синхронізуємо повідомлення
    try {
      const { data: notifications } = await fetchWithTimeout(
        Promise.resolve(supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)),
        10000
      );

      if (notifications && notifications.length > 0) {
        localStorage.setItem('notifications', JSON.stringify(notifications));
      }
    } catch (error) {
      console.warn("Не вдалося синхронізувати повідомлення:", error);
    }

    // Синхронізуємо налаштування сайту
    try {
      const { data: siteSettings } = await fetchWithTimeout(
        Promise.resolve(supabase
          .from('site_settings')
          .select('*')),
        10000
      );

      if (siteSettings && siteSettings.length > 0) {
        siteSettings.forEach(setting => {
          if (setting.id === 'site-logo') {
            localStorage.setItem('customLogo', setting.value);
          } else if (setting.id === 'site-name') {
            localStorage.setItem('siteName', setting.value);
          }
        });
      }
    } catch (error) {
      console.warn("Не вдалося синхронізувати налаштування сайту:", error);
    }
  }, [user?.id]);

  useEffect(() => {
    syncDataOnStartup();
  }, [syncDataOnStartup]);

  return { syncDataOnStartup };
}
