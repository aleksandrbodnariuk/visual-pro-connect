
import React from 'react';
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, Home, MessageCircle, Search } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { User } from "@/hooks/users/types";

interface NavbarNavigationProps {
  currentUser: User | null;
  onCreatePublication: () => void;
}

export function NavbarNavigation({ currentUser, onCreatePublication }: NavbarNavigationProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];

  const handleNavigate = (path: string) => {
    try {
      navigate(path);
    } catch (error) {
      console.error(`Помилка при навігації до ${path}:`, error);
      window.location.href = path;
    }
  };

  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Button 
        variant="ghost" 
        size="icon" 
        className="rounded-full" 
        onClick={() => handleNavigate('/')}
      >
        <Home className="h-5 w-5" />
        <span className="sr-only">{t.home}</span>
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className="rounded-full" 
        onClick={() => handleNavigate('/messages')}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="sr-only">{t.messages}</span>
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className="rounded-full" 
        onClick={() => handleNavigate('/notifications')}
      >
        <Bell className="h-5 w-5" />
        <span className="sr-only">{t.notifications}</span>
      </Button>
    </div>
  );
}
