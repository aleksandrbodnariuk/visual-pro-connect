
import React from 'react';
import { Button } from "@/components/ui/button";
import { Check, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, Language } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const t = translations[language];

  const languages = [
    { code: 'uk', name: t.ukrainian },
    { code: 'en', name: t.english },
    { code: 'pl', name: t.polish },
    { code: 'de', name: t.german },
    { code: 'ro', name: t.romanian },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t.language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code as Language)}
            className="flex items-center justify-between"
          >
            {lang.name}
            {language === lang.code && <Check className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
