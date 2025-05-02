
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
            
            if (error) {
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
                  password: userData.password || ''
                });
              
              if (insertError) {
                console.error("Error creating user in Supabase:", insertError);
              } else {
                console.log("User successfully created in Supabase");
              }
            }
            
            // Sync all users from localStorage to Supabase
            await syncAllUsers();
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
    
    // Function to sync all users from localStorage to Supabase
    const syncAllUsers = async () => {
      try {
        const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
        if (allUsers && allUsers.length > 0) {
          for (const user of allUsers) {
            if (!user.id) continue;
            
            // Check if user exists in Supabase
            const { data: existingUser, error: checkError } = await supabase
              .from('users')
              .select('id')
              .eq('id', user.id)
              .maybeSingle();
              
            if (checkError) {
              console.error("Error checking user:", checkError);
              continue;
            }
            
            // If user doesn't exist, create them
            if (!existingUser) {
              const { error: insertError } = await supabase
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
                  password: user.password || ''
                });
                
              if (insertError) {
                console.error("Error adding user to Supabase:", insertError);
              }
            }
          }
          
          // Fetch the latest users data from Supabase
          const { data: latestUsers, error } = await supabase
            .from('users')
            .select('*');
          
          if (!error && latestUsers) {
            console.log("Latest users from Supabase:", latestUsers);
            
            // Update localStorage with the latest data
            const formattedUsers = latestUsers.map(user => ({
              ...user,
              firstName: user.full_name?.split(' ')[0] || '',
              lastName: user.full_name?.split(' ')[1] || '',
              avatarUrl: user.avatar_url,
              isAdmin: user.is_admin,
              isShareHolder: user.is_shareholder,
              isFounder: user.founder_admin,
              phoneNumber: user.phone_number
            }));
            
            localStorage.setItem('users', JSON.stringify(formattedUsers));
          }
        }
      } catch (error) {
        console.error("Error syncing users:", error);
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
