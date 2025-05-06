
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User, Search, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { User as UserType } from "@/hooks/users/types";

interface UserMenuProps {
  currentUser: UserType | null;
  onOpenCreateModal: () => void;
}

export function UserMenu({ currentUser, onOpenCreateModal }: UserMenuProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];
  const [avatar, setAvatar] = useState<string | null | undefined>(currentUser?.avatarUrl || currentUser?.avatar_url);
  
  // Listen for avatar updates
  useEffect(() => {
    setAvatar(currentUser?.avatarUrl || currentUser?.avatar_url);
    
    const handleAvatarUpdate = (e: CustomEvent) => {
      if (e.detail?.userId === currentUser?.id) {
        setAvatar(e.detail.avatarUrl);
      }
    };
    
    window.addEventListener('avatar-updated', handleAvatarUpdate as EventListener);
    
    return () => {
      window.removeEventListener('avatar-updated', handleAvatarUpdate as EventListener);
    };
  }, [currentUser]);
  
  const handleLogout = async () => {
    try {
      localStorage.removeItem("currentUser");
      toast.success("Ви вийшли з системи");
      navigate("/");
    } catch (error) {
      console.error("Помилка при виході:", error);
      toast.error("Помилка при виході з системи");
    }
  };

  const handleProfileNavigation = () => {
    try {
      if (currentUser && currentUser.id) {
        navigate(`/profile/${currentUser.id}`);
      } else {
        toast.error("Помилка: ID користувача не знайдено");
      }
    } catch (error) {
      console.error("Помилка при навігації до профілю:", error);
      toast.error("Виникла помилка при переході до профілю");
    }
  };

  const handleNavigate = (path: string) => {
    try {
      navigate(path);
    } catch (error) {
      console.error(`Помилка при навігації до ${path}:`, error);
      window.location.href = path;
    }
  };

  if (!currentUser) {
    return (
      <Button variant="secondary" size="sm" onClick={() => handleNavigate('/auth')}>
        Увійти
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={avatar || "/placeholder.svg"} 
              alt={currentUser.firstName}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "/placeholder.svg";
              }} 
            />
            <AvatarFallback>
              {currentUser.firstName 
                ? currentUser.firstName.charAt(0) + (currentUser.lastName ? currentUser.lastName.charAt(0) : '')
                : 'ВП'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Мій акаунт</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleProfileNavigation}>
            <User className="mr-2 h-4 w-4" />
            <span>{t.profile}</span>
          </DropdownMenuItem>
          
          {/* Кнопка створення публікації тепер лише тут */}
          <DropdownMenuItem onClick={onOpenCreateModal}>
            <User className="mr-2 h-4 w-4" />
            <span>Створити публікацію</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleNavigate('/search')}>
            <Search className="mr-2 h-4 w-4" />
            <span>Знайти професіоналів</span>
          </DropdownMenuItem>
          
          {/* Доступ до адмін-панелі для адміністраторів */}
          {(currentUser.isAdmin || currentUser.role === "admin" || 
            currentUser.role === "admin-founder" || currentUser.phoneNumber === "0507068007") && (
            <DropdownMenuItem onClick={() => handleNavigate('/admin')}>
              <User className="mr-2 h-4 w-4" />
              <span>Панель адміністратора</span>
            </DropdownMenuItem>
          )}
          
          {/* Доступ до ринку акцій для акціонерів */}
          {(currentUser.isShareHolder || currentUser.role === "shareholder" || 
            currentUser.status === "Акціонер" || currentUser.phoneNumber === "0507068007") && (
            <DropdownMenuItem onClick={() => handleNavigate('/stock-market')}>
              <User className="mr-2 h-4 w-4" />
              <span>Ринок акцій</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Вийти</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
