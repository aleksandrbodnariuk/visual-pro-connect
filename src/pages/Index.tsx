
import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { NewsFeed } from "@/components/feed/NewsFeed";
import { Hero } from "@/components/home/Hero";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Index() {
  const { language } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        // Перевіряємо наявність автентифікованого користувача
        const currentUser = localStorage.getItem('currentUser');
        const isUserLoggedIn = !!currentUser;
        
        setIsLoggedIn(isUserLoggedIn);
        
        // Якщо користувач авторизований, спробуємо отримати його дані з Supabase
        if (isUserLoggedIn) {
          try {
            const userData = JSON.parse(currentUser || "{}");
            
            // Перевіряємо наявність даних користувача в Supabase
            let { data: userFromDb, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', userData.id)
              .maybeSingle();
            
            if (error) {
              console.error("Помилка отримання користувача з Supabase:", error);
            }
            
            // Якщо в Supabase немає такого користувача, але він є в localStorage
            if (!userFromDb && userData.id) {
              // Створюємо запис в Supabase
              const { error: insertError } = await supabase
                .from('users')
                .insert({
                  id: userData.id,
                  full_name: userData.firstName && userData.lastName ? 
                    `${userData.firstName} ${userData.lastName}` : userData.full_name || '',
                  phone_number: userData.phoneNumber || '',
                  is_admin: userData.isAdmin || userData.role === 'admin' || userData.role === 'admin-founder',
                  is_shareholder: userData.isShareHolder || userData.role === 'shareholder',
                  founder_admin: userData.isFounder || userData.role === 'admin-founder' || 
                    userData.phoneNumber === '0507068007',
                  avatar_url: userData.avatarUrl || '',
                  password: userData.password || 'defaultpassword'
                });
              
              if (insertError && insertError.code !== '23505') {
                console.error("Помилка створення користувача в Supabase:", insertError);
              } else {
                console.log("Користувач успішно створений в Supabase");
              }
            }
            
            // Синхронізуємо всіх користувачів з localStorage в Supabase
            const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
            if (allUsers && allUsers.length > 0) {
              for (const user of allUsers) {
                if (!user.id) continue;
                
                const { data: existingUser, error: checkError } = await supabase
                  .from('users')
                  .select('id')
                  .eq('id', user.id)
                  .maybeSingle();
                  
                if (checkError) {
                  console.error("Помилка перевірки користувача:", checkError);
                  continue;
                }
                
                if (!existingUser) {
                  const { error: insertUserError } = await supabase
                    .from('users')
                    .insert({
                      id: user.id,
                      full_name: user.firstName && user.lastName ? 
                        `${user.firstName} ${user.lastName}` : user.full_name || '',
                      phone_number: user.phoneNumber || '',
                      is_admin: user.isAdmin || user.role === 'admin' || user.role === 'admin-founder',
                      is_shareholder: user.isShareHolder || user.role === 'shareholder',
                      founder_admin: user.isFounder || user.role === 'admin-founder' || 
                        user.phoneNumber === '0507068007',
                      avatar_url: user.avatarUrl || '',
                      password: user.password || 'defaultpassword'
                    });
                    
                  if (insertUserError && insertUserError.code !== '23505') {
                    console.error("Помилка додавання користувача в Supabase:", insertUserError);
                  }
                }
              }
            }
          } catch (error) {
            console.error("Помилка при обробці даних користувача:", error);
          }
        }
      } catch (error) {
        console.error("Помилка при перевірці статусу авторизації:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Завантаження...</div>;
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
