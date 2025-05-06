
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Bell, MessageSquare, User, Settings, Users, Image, Music, Video, Zap, PlusSquare } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { CreatePublicationModal } from "@/components/publications/CreatePublicationModal";
import { useAuthState } from "@/hooks/auth/useAuthState";
import { toast } from "sonner";

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

  return (
    <aside className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      <div className="p-4 space-y-4">
        <Button 
          onClick={handleCreatePublication} 
          className="w-full flex items-center justify-center gap-2"
        >
          <PlusSquare className="mr-2 h-4 w-4" /> Створити публікацію
        </Button>
        
        <h2 className="text-lg font-semibold mb-4">{t.menu}</h2>
        <nav className="space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/')}
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
            className="w-full justify-start" 
            onClick={() => handleNavigate('/messages')}
            data-active={location.pathname === "/messages"}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            {t.messages}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/profile')}
            data-active={location.pathname === "/profile"}
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

      <div className="border-t p-4">
        <h2 className="text-lg font-semibold mb-4">{t.categories}</h2>
        <nav className="space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/category/photographers')}
          >
            <Image className="mr-2 h-4 w-4" />
            {t.photographers}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/category/videographers')}
          >
            <Video className="mr-2 h-4 w-4" />
            {t.videographers}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/category/musicians')}
          >
            <Music className="mr-2 h-4 w-4" />
            {t.musicians}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/category/hosts')}
          >
            <Users className="mr-2 h-4 w-4" />
            {t.hosts}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => handleNavigate('/category/pyrotechnics')}
          >
            <Zap className="mr-2 h-4 w-4" />
            {t.pyrotechnicians}
          </Button>
        </nav>
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
          userName={`${currentUser.firstName || ''} ${currentUser.lastName || ''}`}
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
