
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";

export function NavbarLogo() {
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string>(
    '/lovable-uploads/4c2129b2-6d63-43a9-9c10-18cf11008adb.png'
  );
  const [siteName, setSiteName] = useState<string>("Спільнота B&C");
  
  useEffect(() => {
    // Завантажуємо логотип з localStorage, якщо він є
    const customLogo = localStorage.getItem('customLogo');
    if (customLogo) {
      setLogoUrl(customLogo);
    }
    
    // Завантажуємо назву сайту з localStorage, якщо вона є
    const customSiteName = localStorage.getItem('siteName');
    if (customSiteName) {
      setSiteName(customSiteName);
    }
  }, []);
  
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      navigate("/");
    } catch (error) {
      console.error("Помилка при навігації на головну:", error);
      window.location.href = "/";
    }
  };

  return (
    <Link to="/" className="flex items-center gap-2" onClick={handleLogoClick}>
      <img 
        src={logoUrl} 
        alt={siteName} 
        className="h-9 w-9 object-contain" 
      />
      <span className="hidden font-heading text-xl font-bold md:inline-block">
        <span className="text-gradient-purple">Спільнота</span>
        <span> B&C</span>
      </span>
    </Link>
  );
}
