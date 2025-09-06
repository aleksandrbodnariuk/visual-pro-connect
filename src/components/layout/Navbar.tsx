import React from "react";
import { NavbarLogo } from "./NavbarLogo";
import { NavbarNavigation } from "./NavbarNavigation";
import { NavbarSearch } from "./NavbarSearch";
import { NavbarActions } from "./NavbarActions";
import { useSupabaseAuth } from "@/hooks/auth/useSupabaseAuth";

export function Navbar() {
  const { getCurrentUser } = useSupabaseAuth();
  const currentUser = getCurrentUser();

  // Перевіряємо чи користувач є адміністратором
  const isAdmin = (currentUser?.isAdmin === true) || (currentUser?.founder_admin === true);

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