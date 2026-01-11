import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Bell, MessageSquare, User, Settings, Users, Camera, Music, Video, Sparkles, UtensilsCrossed, Car, Cake, Flower2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { CreatePublicationModal } from "@/components/publications/CreatePublicationModal";
import { useAuthState } from "@/hooks/auth/useAuthState";
import { toast } from "sonner";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const location = useLocation();
  const navigate = useNavigate();
  const { getCurrentUser } = useAuthState();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { unreadCount } = useUnreadMessages();
  
  const currentUser = getCurrentUser();
  
  const handleCreatePublication = () => {
    if (!currentUser) {
      toast.error("Для створення публікації необхідно увійти в систему");
      return;
    }
    setIsCreateModalOpen(true);
  };

  const handleNavigate = (path: string) => {
    try {
      navigate(path);
    } catch (error) {
      console.error(`Помилка при навігації до ${path}:`, error);
      window.location.href = path;
    }
  };

  const handleHomeNavigation = () => {
    try {
      navigate('/');
      // Force page refresh if needed
      if (location.pathname === '/') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Помилка при навігації до головної:', error);
      window.location.href = '/';
    }
  };

  return (
    <aside className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      <div className="p-3 md:p-4 3xl:p-5 space-y-3 md:space-y-4">
        <h2 className="text-base md:text-lg 3xl:text-xl font-semibold mb-3 md:mb-4">{t.menu}</h2>
        <nav className="space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={handleHomeNavigation}
            data-active={location.pathname === "/"}
          >
            <Home className="mr-2 h-4 w-4" />
            {t.home}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/search')}
            data-active={location.pathname === "/search"}
          >
            <Search className="mr-2 h-4 w-4" />
            {t.search}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/notifications')}
            data-active={location.pathname === "/notifications"}
          >
            <Bell className="mr-2 h-4 w-4" />
            {t.notifications}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start relative" 
            onClick={() => handleNavigate('/messages')}
            data-active={location.pathname === "/messages"}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            {t.messages}
            {unreadCount > 0 && (
              <span className="absolute right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => {
              if (currentUser?.id) {
                handleNavigate(`/profile/${currentUser.id}`);
              } else {
                toast.error("Будь ласка, увійдіть в систему");
              }
            }}
            data-active={location.pathname.includes("/profile")}
          >
            <User className="mr-2 h-4 w-4" />
            {t.profile}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/friends')}
            data-active={location.pathname.startsWith("/friends")}
          >
            <Users className="mr-2 h-4 w-4" />
            Друзі
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/settings')}
            data-active={location.pathname === "/settings"}
          >
            <Settings className="mr-2 h-4 w-4" />
            {t.settings}
          </Button>
        </nav>
      </div>

      <div className="border-t p-3 md:p-4 3xl:p-5">
        <h2 className="text-base md:text-lg 3xl:text-xl font-semibold mb-3 md:mb-4">{t.categories}</h2>
        <nav className="space-y-1 md:space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/category/photographer')}
          >
            <Camera className="mr-2 h-4 w-4" />
            {t.photographers}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/category/videographer')}
          >
            <Video className="mr-2 h-4 w-4" />
            {t.videographers}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/category/musician')}
          >
            <Music className="mr-2 h-4 w-4" />
            {t.musicians}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/category/host')}
          >
            <Users className="mr-2 h-4 w-4" />
            {t.hosts}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/category/pyrotechnician')}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {t.pyrotechnicians}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/category/restaurant')}
          >
            <UtensilsCrossed className="mr-2 h-4 w-4" />
            Ресторани
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/category/transport')}
          >
            <Car className="mr-2 h-4 w-4" />
            Транспорт
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/category/florist')}
          >
            <Flower2 className="mr-2 h-4 w-4" />
            Флористи
          </Button>
        </nav>
      </div>

      <div className="border-t p-4">
        <Button 
          onClick={handleCreatePublication} 
          className="w-full"
        >
          Створити публікацію
        </Button>
      </div>
      
      <div className="border-t p-4">
        <div className="rounded-lg bg-muted p-4">
          <h3 className="font-medium mb-2">{t.expandNetwork}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {t.findClientsPartners}
          </p>
          <Button size="sm" className="w-full" onClick={() => handleNavigate('/connect')}>
            {t.findContacts}
          </Button>
        </div>
      </div>
      
      {/* Модальне вікно створення публікації */}
      {currentUser && (
        <CreatePublicationModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          userId={currentUser.id}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            toast.success("Публікацію створено");
            window.location.reload();
          }}
        />
      )}
    </aside>
  );
}
