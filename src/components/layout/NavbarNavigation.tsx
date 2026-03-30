
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface NavbarNavigationProps {
  isAdmin: boolean;
}

export function NavbarNavigation({ isAdmin }: NavbarNavigationProps) {
  const location = useLocation();
  const { unreadCount } = useUnreadMessages();
  const { user } = useAuth();
  const [isSpecialist, setIsSpecialist] = useState(false);
  const [hasStockAccess, setHasStockAccess] = useState(false);
  const [isRepresentative, setIsRepresentative] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    if (!user) { setIsSpecialist(false); setHasStockAccess(false); setIsRepresentative(false); setIsModerator(false); return; }

    const checkRepAccess = async () => {
      try {
        for (const role of ['representative', 'manager', 'director'] as const) {
          const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: role as any });
          if (data === true) return true;
        }
      } catch { /* ignore */ }
      return false;
    };

    Promise.all([
      supabase.rpc('has_role', { _user_id: user.id, _role: 'specialist' as any }),
      supabase.rpc('has_stock_market_access', { _user_id: user.id }),
      checkRepAccess(),
    ]).then(([specRes, stockRes, repAccess]) => {
      setIsSpecialist(specRes.data === true);
      setHasStockAccess(stockRes.data === true);
      setIsRepresentative(repAccess);
    });
  }, [user]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="hidden md:flex items-center space-x-6">
      <Link
        to="/"
        className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
          isActive("/") ? "text-foreground" : "text-foreground/60"
        }`}
      >
        Головна
      </Link>
      <Link
        to="/search"
        className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
          isActive("/search") ? "text-foreground" : "text-foreground/60"
        }`}
      >
        Знайти професіоналів
      </Link>
      <Link
        to="/friends"
        className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
          isActive("/friends") ? "text-foreground" : "text-foreground/60"
        }`}
      >
        Друзі
      </Link>
      <Link
        to="/messages"
        onClick={(e) => {
          if (location.pathname === '/messages') {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('messages-force-reload'));
          }
        }}
        className={`relative text-sm font-medium transition-colors hover:text-foreground/80 ${
          isActive("/messages") ? "text-foreground" : "text-foreground/60"
        }`}
      >
        Повідомлення
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-4 bg-destructive text-destructive-foreground text-xs rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
      {(hasStockAccess || isAdmin) && (
        <Link
          to="/stock-market"
          className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
            isActive("/stock-market") ? "text-foreground" : "text-foreground/60"
          }`}
        >
          Ринок акцій
        </Link>
      )}
      {(isSpecialist || isAdmin) && (
        <Link
          to="/panel-fahivtsya"
          className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
            isActive("/panel-fahivtsya") ? "text-foreground" : "text-foreground/60"
          }`}
        >
          Кабінет
        </Link>
      )}
      {(isRepresentative || isAdmin) && (
        <Link
          to="/representative-panel"
          className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
            isActive("/representative-panel") ? "text-foreground" : "text-foreground/60"
          }`}
        >
          Представники
        </Link>
      )}
      {isAdmin && (
        <Link
          to="/admin"
          className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
            isActive("/admin") ? "text-foreground" : "text-foreground/60"
          }`}
        >
          Адмін
        </Link>
      )}
    </div>
  );
}
