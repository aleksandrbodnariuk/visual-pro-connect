import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Bell, MessageSquare, User, Settings, Users, Crown, TrendingUp, Award } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { useAuthState } from "@/hooks/auth/useAuthState";
import { toast } from "sonner";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useDynamicCategories, getIconComponent } from "@/hooks/useDynamicCategories";
import { supabase } from "@/integrations/supabase/client";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const location = useLocation();
  const navigate = useNavigate();
  const { getCurrentUser } = useAuthState();
  const { unreadCount } = useUnreadMessages();
  const { unreadCount: unreadNotifCount } = useUnreadNotifications();
  const { categories } = useDynamicCategories();
  
  const currentUser = getCurrentUser();
  const [isShareholder, setIsShareholder] = useState(false);
  const [hasStockAccess, setHasStockAccess] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) { setIsShareholder(false); setHasStockAccess(false); return; }
    Promise.all([
      supabase.rpc('has_role', { _user_id: currentUser.id, _role: 'shareholder' as any }),
      supabase.rpc('has_stock_market_access', { _user_id: currentUser.id }),
    ]).then(([shRes, stockRes]) => {
      setIsShareholder(shRes.data === true || currentUser.founder_admin === true);
      setHasStockAccess(stockRes.data === true || currentUser.founder_admin === true);
    });
  }, [currentUser?.id]);

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
      if (location.pathname === '/') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Помилка при навігації до головної:', error);
      window.location.href = '/';
    }
  };

  return (
    <aside 
      className={cn(
        "rounded-lg border bg-card scrollbar-hide",
        className
      )}
    >
      <div className="p-3 md:p-4 3xl:p-5 space-y-3 md:space-y-4">
        <h2 className="text-base md:text-lg 3xl:text-xl font-semibold mb-3 md:mb-4">{t.menu}</h2>
        <nav className="space-y-2">
          <Button variant="ghost" className="w-full justify-start" onClick={handleHomeNavigation} data-active={location.pathname === "/"}>
            <Home className="mr-2 h-4 w-4" /> {t.home}
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => handleNavigate('/search')} data-active={location.pathname === "/search"}>
            <Search className="mr-2 h-4 w-4" /> {t.search}
          </Button>
          <Button variant="ghost" className="w-full justify-start relative" onClick={() => handleNavigate('/notifications')} data-active={location.pathname === "/notifications"}>
            <Bell className="mr-2 h-4 w-4" /> {t.notifications}
            {unreadNotifCount > 0 && (
              <span className="absolute right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
              </span>
            )}
          </Button>
          <Button variant="ghost" className="w-full justify-start relative" onClick={() => handleNavigate('/messages')} data-active={location.pathname === "/messages"}>
            <MessageSquare className="mr-2 h-4 w-4" /> {t.messages}
            {unreadCount > 0 && (
              <span className="absolute right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => {
            if (currentUser?.id) { handleNavigate(`/profile/${currentUser.id}`); }
            else { toast.error("Будь ласка, увійдіть в систему"); }
          }} data-active={location.pathname.includes("/profile")}>
            <User className="mr-2 h-4 w-4" /> {t.profile}
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => handleNavigate('/friends')} data-active={location.pathname.startsWith("/friends")}>
            <Users className="mr-2 h-4 w-4" /> Друзі
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => handleNavigate('/settings')} data-active={location.pathname === "/settings"}>
            <Settings className="mr-2 h-4 w-4" /> {t.settings}
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => handleNavigate('/sertyfikaty')} data-active={location.pathname.startsWith("/sertyfikaty")}>
            <Award className="mr-2 h-4 w-4 text-amber-500" /> Сертифікати
          </Button>
          {isShareholder && (
            <Button variant="ghost" className="w-full justify-start" onClick={() => handleNavigate('/shareholder-panel')} data-active={location.pathname === "/shareholder-panel"}>
              <Crown className="mr-2 h-4 w-4" /> Панель акціонера
            </Button>
          )}
          {hasStockAccess && (
            <Button variant="ghost" className="w-full justify-start" onClick={() => handleNavigate('/stock-market')} data-active={location.pathname === "/stock-market"}>
              <TrendingUp className="mr-2 h-4 w-4" /> Ринок акцій
            </Button>
          )}
        </nav>
      </div>

      <div className="border-t p-3 md:p-4 3xl:p-5">
        <h2 className="text-base md:text-lg 3xl:text-xl font-semibold mb-1">Знайти послугу</h2>
        <p className="text-xs text-muted-foreground mb-3 md:mb-4">Категорії</p>
        <nav className="space-y-1 md:space-y-2">
          {categories.map(cat => {
            const Icon = getIconComponent(cat.icon);
            return (
              <Button key={cat.id} variant="ghost" className="w-full justify-start" onClick={() => handleNavigate(`/category/${cat.id}`)}>
                <Icon className="mr-2 h-4 w-4" /> {cat.name}
              </Button>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="rounded-lg bg-muted p-4">
          <h3 className="font-medium mb-2">Знаходьте нових друзів</h3>
          <Button size="sm" className="w-full" onClick={() => handleNavigate('/connect')}>{t.findContacts}</Button>
        </div>
      </div>
    </aside>
  );
}
