
import React, { useState, useEffect } from "react";
import { NavbarLogo } from "./NavbarLogo";
import { NavbarNavigation } from "./NavbarNavigation";
import { NavbarSearch } from "./NavbarSearch";
import { NavbarActions } from "./NavbarActions";

export function Navbar() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
    
    const handleUserUpdate = () => {
      const user = localStorage.getItem('currentUser');
      if (user) {
        setCurrentUser(JSON.parse(user));
      }
    };

    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, []);

  // Перевіряємо чи користувач є адміністратором
  const isAdmin = currentUser?.is_admin === true || currentUser?.role === 'admin';

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <NavbarLogo />
          <NavbarNavigation isAdmin={isAdmin} />
        </div>
        
        <div className="flex items-center gap-4">
          <NavbarSearch />
          <NavbarActions />
        </div>
      </div>
    </nav>
  );
}
