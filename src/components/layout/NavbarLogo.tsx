
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSiteSettings } from '@/context/SiteSettingsContext';

export function NavbarLogo() {
  const { logoUrl, siteName, isLoading } = useSiteSettings();

  return (
    <NavLink to="/" className="flex items-center space-x-2">
      {isLoading ? (
        <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
      ) : (
        <>
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt={siteName}
              className="h-10 max-w-[180px] object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <span className="font-bold text-xl">{siteName}</span>
        </>
      )}
    </NavLink>
  );
}
