import React from "react";
import { NavbarLogo } from "./NavbarLogo";
import { NavbarNavigation } from "./NavbarNavigation";
import { NavbarSearch } from "./NavbarSearch";
import { NavbarActions } from "./NavbarActions";
import { useSupabaseAuth } from "@/hooks/auth/useSupabaseAuth";

export function Navbar() {
  const { getCurrentUser, isAuthenticated, loading } = useSupabaseAuth();
  const currentUser = getCurrentUser();

  // Если пользователь не аутентифицирован через Supabase, но есть данные в localStorage
  React.useEffect(() => {
    if (!loading && !isAuthenticated()) {
      const localUser = localStorage.getItem('currentUser');
      if (localUser) {
        // Очищаем старые данные и перенаправляем на авторизацию
        localStorage.removeItem('currentUser');
        window.location.href = '/auth';
      }
    }
  }, [loading, isAuthenticated]);

  // Перевіряємо чи користувач є адміністратором
  const isAdmin = (currentUser?.isAdmin === true) || (currentUser?.founder_admin === true);

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-14 sm:h-16 3xl:h-20 items-center justify-between px-3 sm:px-4 md:px-6">
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
          <NavbarLogo />
          <NavbarNavigation isAdmin={isAdmin} />
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <NavbarSearch />
          <NavbarActions />
        </div>
      </div>
    </nav>
  );
}