import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchWithTimeout } from '@/lib/utils';

export function useDataSync() {
  // Синхронізує дані з Supabase при завантаженні компонента
  const syncDataOnStartup = useCallback(async () => {
    try {
      // Use Supabase Auth instead of localStorage
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.id) {
        return; // Немає авторизованого користувача
      }

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
          console.log("Запити друзів синхронізовано з Supabase");
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
          console.log("Повідомлення синхронізовано з Supabase");
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
          // Оновлюємо localStorage з актуальними даними
          siteSettings.forEach(setting => {
            if (setting.id === 'site-logo') {
              localStorage.setItem('customLogo', setting.value);
            } else if (setting.id === 'site-name') {
              localStorage.setItem('siteName', setting.value);
            }
          });
          console.log("Налаштування сайту синхронізовано з Supabase");
        }
      } catch (error) {
        console.warn("Не вдалося синхронізувати налаштування сайту:", error);
      }

    } catch (error) {
      console.error("Помилка синхронізації даних:", error);
    }
  }, []);

  // Запускаємо синхронізацію при завантаженні
  useEffect(() => {
    syncDataOnStartup();
  }, [syncDataOnStartup]);

  return {
    syncDataOnStartup
  };
}