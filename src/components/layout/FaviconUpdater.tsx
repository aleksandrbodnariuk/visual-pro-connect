import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function FaviconUpdater() {
  useEffect(() => {
    const updateFavicon = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('id', 'site-logo')
          .maybeSingle();

        if (data?.value) {
          let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
          if (link) {
            link.href = data.value;
          } else {
            link = document.createElement('link');
            link.rel = 'icon';
            link.type = 'image/png';
            link.href = data.value;
            document.head.appendChild(link);
          }
        }
      } catch (error) {
        console.error('Помилка оновлення favicon:', error);
      }
    };

    updateFavicon();

    const handleLogoUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.url) {
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (link) {
          link.href = customEvent.detail.url;
        }
      } else {
        updateFavicon();
      }
    };

    window.addEventListener('logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('logo-updated', handleLogoUpdate);
  }, []);

  return null;
}
