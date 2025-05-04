
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, MessageSquare, User, Settings, Users, Image, Music, Video, Zap, Plus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { SidebarCreateButton } from './SidebarCreateButton';
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

  return (
    <aside className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      <div className="p-4 space-y-4">
        <SidebarCreateButton onClick={handleCreatePublication} />
        
        <h2 className="text-lg font-semibold mb-4">{t.menu}</h2>
        <nav className="space-y-2">
          <Button variant="ghost" className="w-full justify-start" asChild data-active={location.pathname === "/"}>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              {t.home}
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild data-active={location.pathname === "/search"}>
            <Link to="/search">
              <Search className="mr-2 h-4 w-4" />
              {t.search}
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild data-active={location.pathname === "/notifications"}>
            <Link to="/notifications">
              <Bell className="mr-2 h-4 w-4" />
              {t.notifications}
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild data-active={location.pathname === "/messages"}>
            <Link to="/messages">
              <MessageSquare className="mr-2 h-4 w-4" />
              {t.messages}
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild data-active={location.pathname === "/profile"}>
            <Link to="/profile">
              <User className="mr-2 h-4 w-4" />
              {t.profile}
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild data-active={location.pathname.startsWith("/friends")}>
            <Link to="/friends">
              <Users className="mr-2 h-4 w-4" />
              Друзі
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild data-active={location.pathname === "/settings"}>
            <Link to="/settings">
              <Settings className="mr-2 h-4 w-4" />
              {t.settings}
            </Link>
          </Button>
        </nav>
      </div>

      <div className="border-t p-4">
        <h2 className="text-lg font-semibold mb-4">{t.categories}</h2>
        <nav className="space-y-2">
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/category/photographers">
              <Image className="mr-2 h-4 w-4" />
              {t.photographers}
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/category/videographers">
              <Video className="mr-2 h-4 w-4" />
              {t.videographers}
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/category/musicians">
              <Music className="mr-2 h-4 w-4" />
              {t.musicians}
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/category/hosts">
              <Users className="mr-2 h-4 w-4" />
              {t.hosts}
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/category/pyrotechnics">
              <Zap className="mr-2 h-4 w-4" />
              {t.pyrotechnicians}
            </Link>
          </Button>
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="rounded-lg bg-muted p-4">
          <h3 className="font-medium mb-2">{t.expandNetwork}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {t.findClientsPartners}
          </p>
          <Button size="sm" className="w-full" asChild>
            <Link to="/connect">{t.findContacts}</Link>
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
          }}
        />
      )}
    </aside>
  );
}
