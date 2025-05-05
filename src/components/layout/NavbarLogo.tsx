
import React from 'react';
import { Link } from 'react-router-dom';

export function NavbarLogo() {
  // Отримуємо кастомне лого з localStorage, якщо воно є
  const customLogo = localStorage.getItem('customLogo');

  return (
    <Link to="/" className="flex items-center gap-2">
      <img 
        src={customLogo || "/lovable-uploads/4c2129b2-6d63-43a9-9c10-18cf11008adb.png"} 
        alt="Логотип" 
        className="h-12 w-12 rounded-full object-cover" // Збільшено розмір та залишено круглим
      />
    </Link>
  );
}
