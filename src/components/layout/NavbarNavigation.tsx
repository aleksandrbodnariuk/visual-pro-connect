
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface NavbarNavigationProps {
  isAdmin: boolean;
}

export function NavbarNavigation({ isAdmin }: NavbarNavigationProps) {
  const location = useLocation();
  const { unreadCount } = useUnreadMessages();

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
      <Link
        to="/stock-market"
        className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
          isActive("/stock-market") ? "text-foreground" : "text-foreground/60"
        }`}
      >
        Біржа
      </Link>
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
