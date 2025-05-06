
import React from 'react';
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export function NavbarSearch() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];
  
  const handleNavigate = () => {
    try {
      navigate('/search');
    } catch (error) {
      console.error(`Помилка при навігації до search:`, error);
      window.location.href = '/search';
    }
  };

  return (
    <div className="ml-auto md:w-auto md:max-w-sm">
      <div className="relative w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t.search}
          className="w-full rounded-full pl-8 md:w-[200px] lg:w-[250px]"
          onClick={handleNavigate}
        />
      </div>
    </div>
  );
}
