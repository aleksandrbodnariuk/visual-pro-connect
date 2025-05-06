
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { NavbarSearch } from "./NavbarSearch";
import { NavbarNavigation } from "./NavbarNavigation";
import { NavbarActions } from "./NavbarActions";
import { NavbarLogo } from "./NavbarLogo";
import { UserMenu } from "./UserMenu";
import { CreatePublicationModal } from "@/components/publications/CreatePublicationModal";
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
  const [createPublicationOpen, setCreatePublicationOpen] = useState(false);
  const { getCurrentUser } = useAuthState();
  const currentUser = getCurrentUser();
  
  return (
    <>
      <header className={`sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur ${className}`}>
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <NavbarLogo />
            {showNav && variant === "default" && 
              <NavbarNavigation 
                className="hidden md:flex" 
                currentUser={currentUser}
                onCreatePublication={() => setCreatePublicationOpen(true)}
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
                  onOpenCreateModal={() => setCreatePublicationOpen(true)}
                />
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Модальне вікно для створення публікації */}
      {currentUser && (
        <CreatePublicationModal 
          open={createPublicationOpen} 
          onOpenChange={setCreatePublicationOpen}
          userId={currentUser.id}
          onSuccess={() => {
            toast.success("Публікацію створено");
          }}
        />
      )}
    </>
  );
}
