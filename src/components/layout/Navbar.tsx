
import { useState } from "react";
import { toast } from "sonner";
import { NavbarSearch } from "./NavbarSearch";
import { NavbarNavigation } from "./NavbarNavigation";
import { NavbarActions } from "./NavbarActions";
import { NavbarLogo } from "./NavbarLogo";
import { UserMenu } from "./UserMenu";
import { useAuthState } from "@/hooks/auth/useAuthState";

interface NavbarProps {
  className?: string;
  variant?: "default" | "simple";
  showSearch?: boolean;
  showNav?: boolean;
  showActions?: boolean;
}

export function Navbar({ 
  className = "", 
  variant = "default",
  showSearch = true,
  showNav = true,
  showActions = true
}: NavbarProps) {
  const { getCurrentUser } = useAuthState();
  const currentUser = getCurrentUser();
  
  // Add empty handler function for onOpenCreateModal
  const handleOpenCreateModal = () => {
    // This is just a placeholder function since we're not implementing the create modal here
    toast.info("Функція створення публікації недоступна");
  };
  
  return (
    <header className={`sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur ${className}`}>
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <NavbarLogo />
          {showNav && variant === "default" && 
            <NavbarNavigation 
              className="hidden md:flex" 
              currentUser={currentUser}
            />
          }
        </div>
        
        <div className="flex items-center gap-4">
          {showSearch && <NavbarSearch />}
          
          {showActions && (
            <div className="flex items-center">
              <NavbarActions />
              <UserMenu 
                currentUser={currentUser}
                onOpenCreateModal={handleOpenCreateModal} 
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
