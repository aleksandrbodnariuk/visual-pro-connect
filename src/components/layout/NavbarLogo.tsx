
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function NavbarLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>('Спільнота B&C');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLogoAndSiteName = async () => {
      try {
        setIsLoading(true);
        
        // ЗАВЖДИ спочатку завантажуємо з Supabase для актуальних даних
        try {
          const { data: logoData } = await supabase
            .from('site_settings')
            .select('value')
            .eq('id', 'site-logo')
            .maybeSingle();

          if (logoData?.value) {
            setLogoUrl(logoData.value);
            localStorage.setItem('customLogo', logoData.value);
          } else {
            // Якщо в Supabase немає логотипу, перевіряємо localStorage
            const cachedLogo = localStorage.getItem('customLogo');
            if (cachedLogo) {
              setLogoUrl(cachedLogo);
            }
          }

          const { data: nameData } = await supabase
            .from('site_settings')
            .select('value')
            .eq('id', 'site-name')
            .maybeSingle();

          if (nameData?.value) {
            setSiteName(nameData.value);
            localStorage.setItem('siteName', nameData.value);
          } else {
            // Якщо в Supabase немає назви, перевіряємо localStorage
            const cachedSiteName = localStorage.getItem('siteName');
            if (cachedSiteName) {
              setSiteName(cachedSiteName);
            }
          }
        } catch (supabaseError) {
          console.warn('Не вдалося завантажити дані з Supabase, використовуємо localStorage:', supabaseError);
          // Fallback до localStorage тільки якщо Supabase недоступний
          const cachedLogo = localStorage.getItem('customLogo');
          const cachedSiteName = localStorage.getItem('siteName');
          
          if (cachedLogo) {
            setLogoUrl(cachedLogo);
          }
          if (cachedSiteName) {
            setSiteName(cachedSiteName);
          }
        }
      } catch (error) {
        console.error('Помилка завантаження логотипу:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLogoAndSiteName();

    // Слухачі подій для оновлень
    const handleLogoUpdate = (e: CustomEvent) => {
      setLogoUrl(e.detail.logoUrl);
    };

    const handleSiteNameUpdate = (e: CustomEvent) => {
      setSiteName(e.detail.siteName);
    };

    window.addEventListener('logo-updated', handleLogoUpdate as EventListener);
    window.addEventListener('sitename-updated', handleSiteNameUpdate as EventListener);

    return () => {
      window.removeEventListener('logo-updated', handleLogoUpdate as EventListener);
      window.removeEventListener('sitename-updated', handleSiteNameUpdate as EventListener);
    };
  }, []);

  return (
    <NavLink to="/" className="flex items-center space-x-2">
      {isLoading ? (
        <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
      ) : logoUrl ? (
        <img 
          src={logoUrl} 
          alt={siteName}
          className="h-8 max-w-[120px] object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            setLogoUrl(null);
          }}
        />
      ) : (
        <span className="font-bold text-xl">{siteName}</span>
      )}
    </NavLink>
  );
}
