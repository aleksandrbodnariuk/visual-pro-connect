
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

interface SidebarCreateButtonProps {
  onClick: () => void;
}

export function SidebarCreateButton({ onClick }: SidebarCreateButtonProps) {
  const { language } = useLanguage();
  const t = translations[language];
  
  return (
    <Button 
      onClick={onClick} 
      className="w-full flex items-center justify-center gap-2"
    >
      <Plus className="h-4 w-4" />
      <span>{t.create || 'Створити'}</span>
    </Button>
  );
}
