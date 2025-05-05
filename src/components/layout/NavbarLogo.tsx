
import React from 'react';
import { Link } from 'react-router-dom';

export function NavbarLogo() {
  // Отримуємо кастомне лого та назву з localStorage
  const customLogo = localStorage.getItem('customLogo');
  const siteName = localStorage.getItem('siteName') || 'Спільнота B&C';

  return (
    <Link to="/" className="flex items-center gap-3">
      <div className="flex-shrink-0">
        <img 
          src={customLogo || "/lovable-uploads/4c2129b2-6d63-43a9-9c10-18cf11008adb.png"} 
          alt="Логотип" 
          className="h-14 w-14 rounded-full object-cover" 
        />
      </div>
      
      <span className="text-lg font-medium hidden md:block">
        {siteName}
      </span>
    </Link>
  );
}
