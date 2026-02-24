
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SiteSettingsContextType {
  logoUrl: string | null;
  siteName: string;
  isLoading: boolean;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  logoUrl: null,
  siteName: 'Спільнота B&C',
  isLoading: true,
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteName, setSiteName] = useState('Спільнота B&C');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('id, value')
          .in('id', ['site-logo', 'site-name']);

        if (!error && data) {
          const logoSetting = data.find(s => s.id === 'site-logo');
          const nameSetting = data.find(s => s.id === 'site-name');
          
          if (logoSetting?.value) {
            setLogoUrl(logoSetting.value);
            localStorage.setItem('customLogo', logoSetting.value);
          } else {
            setLogoUrl('/default-logo.png');
          }
          
          if (nameSetting?.value) {
            setSiteName(nameSetting.value);
            localStorage.setItem('siteName', nameSetting.value);
          }
        } else {
          // Fallback to localStorage
          setLogoUrl(localStorage.getItem('customLogo') || '/default-logo.png');
          setSiteName(localStorage.getItem('siteName') || 'Спільнота B&C');
        }
      } catch {
        setLogoUrl(localStorage.getItem('customLogo') || '/default-logo.png');
        setSiteName(localStorage.getItem('siteName') || 'Спільнота B&C');
      } finally {
        setIsLoading(false);
      }
    };

    load();

    // Listen for updates from admin settings
    const handleLogoUpdate = (e: CustomEvent) => {
      setLogoUrl(e.detail.logoUrl || e.detail.url);
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
    <SiteSettingsContext.Provider value={{ logoUrl, siteName, isLoading }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
