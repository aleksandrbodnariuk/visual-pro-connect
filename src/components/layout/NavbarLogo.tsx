
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
        console.log('Loading logo and site name from Supabase...');
        
        // ЗАВЖДИ завантажуємо з Supabase (без аутентифікації для загальнодоступних налаштувань)
        const { data: logoData, error: logoError } = await supabase
          .from('site_settings')
          .select('value')
          .eq('id', 'site-logo')
          .maybeSingle();

        if (logoError) {
          console.error('Помилка завантаження логотипу з Supabase:', logoError);
        } else if (logoData?.value) {
          console.log('Logo loaded from Supabase:', logoData.value);
          setLogoUrl(logoData.value);
          localStorage.setItem('customLogo', logoData.value);
        } else {
          console.log('No logo in Supabase, using default logo...');
          setLogoUrl('/default-logo.png');
        }

        const { data: nameData, error: nameError } = await supabase
          .from('site_settings')
          .select('value')
          .eq('id', 'site-name')
          .maybeSingle();

        if (nameError) {
          console.error('Помилка завантаження назви сайту з Supabase:', nameError);
        } else if (nameData?.value) {
          console.log('Site name loaded from Supabase:', nameData.value);
          setSiteName(nameData.value);
          localStorage.setItem('siteName', nameData.value);
        } else {
          console.log('No site name in Supabase, checking localStorage...');
          const cachedSiteName = localStorage.getItem('siteName');
          if (cachedSiteName) {
            setSiteName(cachedSiteName);
          }
        }
      } catch (error) {
        console.error('Помилка завантаження налаштувань:', error);
        // Fallback до localStorage або логотип за замовчуванням
        const cachedLogo = localStorage.getItem('customLogo');
        const cachedSiteName = localStorage.getItem('siteName');
        
        if (cachedLogo) {
          setLogoUrl(cachedLogo);
        } else {
          setLogoUrl('/default-logo.png');
        }
        if (cachedSiteName) {
          setSiteName(cachedSiteName);
        }
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
