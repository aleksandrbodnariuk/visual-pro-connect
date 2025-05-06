
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function NavbarLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(localStorage.getItem('customLogo') || null);
  const [siteName, setSiteName] = useState<string>(localStorage.getItem('siteName') || 'Спільнота B&C');

  useEffect(() => {
    // Load logo from site_settings if available
    const loadLogoAndSiteName = async () => {
      try {
        // Try to get logo URL
        const { data: logoData, error: logoError } = await supabase
          .from('site_settings')
          .select('value')
          .eq('id', 'site-logo')
          .single();

        if (!logoError && logoData) {
          setLogoUrl(logoData.value);
          localStorage.setItem('customLogo', logoData.value);
        }

        // Try to get site name
        const { data: nameData, error: nameError } = await supabase
          .from('site_settings')
          .select('value')
          .eq('id', 'site-name')
          .single();

        if (!nameError && nameData) {
          setSiteName(nameData.value);
          localStorage.setItem('siteName', nameData.value);
        }
      } catch (error) {
        console.error('Failed to load logo or site name:', error);
      }
    };

    loadLogoAndSiteName();

    // Listen for logo updates
    const handleLogoUpdate = (e: CustomEvent) => {
      setLogoUrl(e.detail.logoUrl);
    };

    // Listen for site name updates
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
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={siteName}
          className="h-8 max-w-[120px] object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.style.display = 'none';
          }}
        />
      ) : (
        <span className="font-bold text-xl">{siteName}</span>
      )}
    </NavLink>
  );
}
