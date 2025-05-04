
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { NavbarLogo } from "./NavbarLogo";
import { NavbarSearch } from "./NavbarSearch";
import { NavbarNavigation } from "./NavbarNavigation";
import { NavbarActions } from "./NavbarActions";
import { UserMenu } from "./UserMenu";
import { CreatePublicationModal } from "@/components/publications/CreatePublicationModal";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/hooks/users/types";
import { useAuthState } from "@/hooks/auth/useAuthState";

export function Navbar() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { syncUser } = useAuthState();
  
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Отримуємо дані користувача з localStorage
        const userJSON = localStorage.getItem("currentUser");
        if (!userJSON) {
          return;
        }
        
        const user = JSON.parse(userJSON);
        
        try {
          // Перевіряємо, чи існує користувач в Supabase і отримуємо актуальні дані
          const { data: supabaseUsers, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .limit(1);
            
          if (error) {
            console.error("Error fetching user from Supabase:", error);
            setCurrentUser(user); // Якщо помилка, використовуємо локальні дані
            return;
          }
          
          if (supabaseUsers && supabaseUsers.length > 0) {
            const supabaseUser = supabaseUsers[0];
            // Перевіряємо, чи це засновник і оновлюємо його статус якщо потрібно
            const isFounderByPhone = supabaseUser.phone_number === "0507068007";
            
            const updatedUser = {
              ...user,
              id: supabaseUser.id,
              firstName: user.firstName || supabaseUser.full_name?.split(' ')[0] || '',
              lastName: user.lastName || supabaseUser.full_name?.split(' ')[1] || '',
              phoneNumber: user.phoneNumber || supabaseUser.phone_number || '',
              avatarUrl: user.avatarUrl || supabaseUser.avatar_url || '',
              isAdmin: supabaseUser.is_admin || isFounderByPhone,
              isFounder: supabaseUser.founder_admin || isFounderByPhone,
              isShareHolder: supabaseUser.is_shareholder || isFounderByPhone,
              password: supabaseUser.password,
              role: isFounderByPhone ? "admin-founder" : 
                  (supabaseUser.is_admin ? "admin" : 
                  (supabaseUser.is_shareholder ? "shareholder" : "user")),
              status: isFounderByPhone ? "Адміністратор-засновник" : 
                    (supabaseUser.is_admin ? "Адміністратор" : 
                    (supabaseUser.is_shareholder ? "Акціонер" : "Звичайний користувач")),
              bio: supabaseUser.bio || user.bio || '',
              website: supabaseUser.website || user.website || '',
              instagram: supabaseUser.instagram || user.instagram || '',
              facebook: supabaseUser.facebook || user.facebook || '',
              viber: supabaseUser.viber || user.viber || ''
            };
            
            // Оновлюємо дані в localStorage
            localStorage.setItem("currentUser", JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);
            
            // Якщо це засновник (0507068007), але статуси неправильні, оновлюємо їх в Supabase
            if (isFounderByPhone && 
              (!supabaseUser.founder_admin || !supabaseUser.is_admin || !supabaseUser.is_shareholder)) {
              
              const { error: updateError } = await supabase
                .from('users')
                .update({
                  founder_admin: true,
                  is_admin: true,
                  is_shareholder: true
                })
                .eq('id', supabaseUser.id);
                
              if (updateError) {
                console.error("Error updating founder status:", updateError);
              }
            }
          } else {
            // Якщо користувач не знайдений в Supabase, синхронізуємо його
            await syncUser();
            setCurrentUser(user);
          }
        } catch (supabaseError) {
          console.error("Error with Supabase:", supabaseError);
          // Якщо помилка з Supabase, використовуємо дані з localStorage
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Помилка при завантаженні даних користувача:", error);
      }
    };
    
    loadUserData();
  }, [syncUser]);

  const handleCreatePublication = () => {
    setIsCreateModalOpen(true);
  };
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2 md:gap-4">
          <NavbarLogo />
          
          <div className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          
          <NavbarSearch />
        </div>
        
        <nav className="flex items-center gap-1 md:gap-2">
          <NavbarNavigation 
            currentUser={currentUser}
            onCreatePublication={handleCreatePublication}
          />
          
          <UserMenu 
            currentUser={currentUser}
            onOpenCreateModal={handleCreatePublication}
          />
          
          <NavbarActions />
        </nav>
      </div>
      
      {/* Модальне вікно створення публікації */}
      {currentUser && (
        <CreatePublicationModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          userId={currentUser.id}
          userName={`${currentUser.firstName || ''} ${currentUser.lastName || ''}`}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            toast.success("Публікацію створено");
          }}
        />
      )}
    </header>
  );
}
