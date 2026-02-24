import { useEffect } from 'react';
import { useSiteSettings } from '@/context/SiteSettingsContext';

export function FaviconUpdater() {
  const { logoUrl } = useSiteSettings();

  useEffect(() => {
    if (!logoUrl || logoUrl === '/default-logo.png') return;
    
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (link) {
      link.href = logoUrl;
    } else {
      link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.href = logoUrl;
      document.head.appendChild(link);
    }
  }, [logoUrl]);

  // Also listen for direct logo-updated events (from admin settings save)
  useEffect(() => {
    const handleLogoUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.url) {
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (link) link.href = customEvent.detail.url;
      }
    };
    window.addEventListener('logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('logo-updated', handleLogoUpdate);
  }, []);

  return null;
}
