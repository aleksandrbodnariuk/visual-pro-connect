
import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { NewsFeed } from "@/components/feed/NewsFeed";
import { Hero } from "@/components/home/Hero";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { syncAllUsersToSupabase } from "@/hooks/users/usersSync";

export default function Index() {
  const { language } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const syncUserData = async () => {
      setIsLoading(true);
      try {
        // Check if user is authenticated
        const currentUser = localStorage.getItem('currentUser');
        const isUserLoggedIn = !!currentUser;
        
        setIsLoggedIn(isUserLoggedIn);
        
        // If user is logged in, try to get their data from Supabase
        if (isUserLoggedIn) {
          try {
            const userData = JSON.parse(currentUser || "{}");
            
            // Check if user exists in Supabase
            const { data: userFromDb, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', userData.id)
              .maybeSingle();
            
            if (error && error.code !== 'PGRST116') {
              console.error("Error fetching user from Supabase:", error);
            }
            
            // If user doesn't exist in Supabase but is in localStorage
            if (!userFromDb && userData.id) {
              // Create record in Supabase
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
                  password: userData.password || '',
                  categories: userData.categories || []
                });
              
              if (insertError) {
                console.error("Error creating user in Supabase:", insertError);
              } else {
                console.log("User successfully created in Supabase");
              }
            } else if (userFromDb) {
              // If user exists in Supabase but data might be outdated in localStorage
              // Update localStorage with fresh data
              const updatedUser = {
                ...userData,
                id: userFromDb.id,
                firstName: userData.firstName || userFromDb.full_name?.split(' ')[0] || '',
                lastName: userData.lastName || userFromDb.full_name?.split(' ')[1] || '',
                phoneNumber: userData.phoneNumber || userFromDb.phone_number || '',
                password: userFromDb.password || userData.password || '',
                isAdmin: userFromDb.is_admin || userData.isAdmin || false,
                isFounder: userFromDb.founder_admin || userData.isFounder || false,
                isShareHolder: userFromDb.is_shareholder || userData.isShareHolder || false,
                avatarUrl: userData.avatarUrl || userFromDb.avatar_url || '',
                categories: userFromDb.categories || userData.categories || []
              };
              
              localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            }
            
            // Sync all users from localStorage to Supabase
            await syncAllUsersToSupabase();
          } catch (error) {
            console.error("Error processing user data:", error);
          }
        }
      } catch (error) {
        console.error("Error checking authentication status:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    syncUserData();
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
