import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useDataSync() {
  // Синхронізує дані з Supabase при завантаженні компонента
  const syncDataOnStartup = useCallback(async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      
      if (!currentUser || !currentUser.id) {
        return; // Немає авторизованого користувача
      }

      console.log("Синхронізація даних для користувача:", currentUser.id);

      // Синхронізуємо запити друзів
      try {
        const { data: friendRequests } = await supabase
          .from('friend_requests')
          .select('*')
          .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

        if (friendRequests && friendRequests.length > 0) {
          localStorage.setItem('friendRequests', JSON.stringify(friendRequests));
          console.log("Запити друзів синхронізовано з Supabase");
        }
      } catch (error) {
        console.warn("Не вдалося синхронізувати запити друзів:", error);
      }

      // Синхронізуємо повідомлення
      try {
        const { data: notifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUser.id);

        if (notifications && notifications.length > 0) {
          localStorage.setItem('notifications', JSON.stringify(notifications));
          console.log("Повідомлення синхронізовано з Supabase");
        }
      } catch (error) {
        console.warn("Не вдалося синхронізувати повідомлення:", error);
      }

      // Синхронізуємо налаштування сайту
      try {
        const { data: siteSettings } = await supabase
          .from('site_settings')
          .select('*');

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