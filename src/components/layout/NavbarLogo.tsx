
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
              className="h-10 max-w-[120px] sm:max-w-[180px] object-contain shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <span className={logoUrl ? "hidden lg:inline font-bold text-xl whitespace-nowrap" : "font-bold text-lg sm:text-xl whitespace-nowrap truncate max-w-[45vw]"}>{siteName}</span>
        </>
      )}
    </NavLink>
  );
}
