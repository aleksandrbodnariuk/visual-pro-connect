
import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { NewsFeed } from "@/components/feed/NewsFeed";
import { Hero } from "@/components/home/Hero";
import { useLanguage } from "@/context/LanguageContext";

export default function Index() {
  const { language } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const currentUser = localStorage.getItem('currentUser');
        setIsLoggedIn(!!currentUser);
      } catch (error) {
        console.error("Помилка перевірки авторизації:", error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Завантаження...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10">
      <Navbar />
      {!isLoggedIn && <Hero />}
      <div className="container mt-8 grid grid-cols-12 gap-6">
        {isLoggedIn && (
          <div className="hidden md:block md:col-span-3">
            <Sidebar className="sticky top-20" />
          </div>
        )}
        <main className={`col-span-12 ${isLoggedIn ? 'md:col-span-9' : ''}`}>
          {isLoggedIn && <NewsFeed />}
        </main>
      </div>
    </div>
  );
}
