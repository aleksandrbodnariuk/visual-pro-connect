
import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";

export function NavbarLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoText, setLogoText] = useState<string>("Спільнота B&C");

  useEffect(() => {
    // Завантаження логотипу з localStorage
    const storedLogoUrl = localStorage.getItem("siteLogoUrl");
    const storedLogoText = localStorage.getItem("siteLogoText");
    
    if (storedLogoUrl) {
      setLogoUrl(storedLogoUrl);
    }
    
    if (storedLogoText) {
      setLogoText(storedLogoText);
    }

    // Слухач для змін логотипу в localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "siteLogoUrl" && e.newValue) {
        setLogoUrl(e.newValue);
      }
      if (e.key === "siteLogoText" && e.newValue) {
        setLogoText(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <Link to="/" className="flex items-center space-x-2">
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={logoText}
          className="h-8 w-auto"
        />
      ) : (
        <span className="font-bold text-lg text-primary">
          {logoText}
        </span>
      )}
      
      <span className="text-xl font-bold hidden md:block">
        {!logoUrl && logoText}
      </span>
    </Link>
  );
}
