
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function NavbarLogo() {
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>("Спільнота B&C");
  
  // Load logo and site name from localStorage on component mount
  useEffect(() => {
    const storedLogo = localStorage.getItem('customLogo');
    const storedName = localStorage.getItem('siteName');
    
    if (storedLogo) {
      setCustomLogo(storedLogo);
    }
    
    if (storedName) {
      setSiteName(storedName);
    }
  }, []);

  return (
    <Link to="/" className="flex items-center gap-3">
      <div className="relative h-14 w-14 flex-shrink-0">
        <img 
          src={customLogo || "/lovable-uploads/4c2129b2-6d63-43a9-9c10-18cf11008adb.png"} 
          alt="Логотип" 
          className="h-full w-full rounded-full object-cover" 
        />
      </div>
      
      <span className="text-lg font-medium hidden md:block">
        {siteName}
      </span>
    </Link>
  );
}
