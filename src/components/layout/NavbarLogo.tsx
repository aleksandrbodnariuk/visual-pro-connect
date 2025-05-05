
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function NavbarLogo() {
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>("Спільнота B&C");
  
  // Load logo and site name on component mount
  useEffect(() => {
    // First try to load from localStorage (for backward compatibility)
    const storedLogo = localStorage.getItem('customLogo');
    if (storedLogo) {
      setCustomLogo(storedLogo);
    }
    
    // Load site name from database
    async function loadSiteName() {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("id", "site-name")
          .single();
          
        if (error) {
          console.error("Error loading site name:", error);
          // Fall back to localStorage if database fails
          const storedName = localStorage.getItem('siteName');
          if (storedName) {
            setSiteName(storedName);
          }
          return;
        }
        
        if (data) {
          setSiteName(data.value);
        }
      } catch (error) {
        console.error("Failed to load site name:", error);
        // Fall back to localStorage
        const storedName = localStorage.getItem('siteName');
        if (storedName) {
          setSiteName(storedName);
        }
      }
    }
    
    loadSiteName();
  }, []);

  return (
    <Link to="/" className="flex items-center gap-3">
      <div className="h-14 w-14 flex-shrink-0">
        <img 
          src={customLogo || "/lovable-uploads/4c2129b2-6d63-43a9-9c10-18cf11008adb.png"} 
          alt="Логотип" 
          className="h-full w-full object-contain" 
        />
      </div>
      
      <span className="text-lg font-medium hidden md:block">
        {siteName}
      </span>
    </Link>
  );
}
