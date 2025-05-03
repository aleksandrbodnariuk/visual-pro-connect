
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { User, UseUsersReturnType } from './types';
import { syncAllUsersToSupabase, formatUserFromSupabase } from './usersSync';
import { deleteUser as deleteUserAction, changeUserStatus as changeUserStatusAction, toggleShareholderStatus as toggleShareholderStatusAction } from './userManagement';

export function useUsers(): UseUsersReturnType {
  const [users, setUsers] = useState<User[]>([]);
  const [isFounder, setIsFounder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Check if current user is a founder
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
      
      // Check if this is founder
      const isFounderAdmin = currentUser.role === "admin-founder" || 
                            currentUser.isFounder || 
                            (currentUser.phoneNumber === "0507068007");
      
      setIsFounder(isFounderAdmin);
      
      // Try to get data from Supabase first
      const { data: supabaseUsers, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error("Error fetching users from Supabase:", fetchError);
        throw fetchError;
      }
      
      if (supabaseUsers && supabaseUsers.length > 0) {
        console.log("Users loaded from Supabase:", supabaseUsers);
        
        // Make sure founder has correct status
        const updatedUsers = supabaseUsers.map(user => {
          if (user.phone_number === "0507068007") {
            // If this is the founder, ensure correct status
            supabase
              .from('users')
              .update({
                founder_admin: true,
                is_admin: true,
                is_shareholder: true
              })
              .eq('id', user.id)
              .then(({ error }) => {
                if (error) {
                  console.error("Error updating founder status:", error);
                }
              });
            
            return formatUserFromSupabase({
              ...user,
              founder_admin: true,
              is_admin: true,
              is_shareholder: true
            });
          }
          
          return formatUserFromSupabase(user);
        });
        
        setUsers(updatedUsers);
        localStorage.setItem("users", JSON.stringify(updatedUsers));
      } else {
        // If no Supabase data, use localStorage and sync to Supabase
        const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
        
        if (storedUsers.length > 0) {
          console.log("Using users from localStorage and syncing to Supabase:", storedUsers);
          
          // Sync localStorage users to Supabase
          const syncedUsers = await syncAllUsersToSupabase();
          
          if (syncedUsers.length > 0) {
            setUsers(syncedUsers);
          } else {
            setUsers(storedUsers);
          }
        } else {
          setUsers([]);
        }
      }
    } catch (error) {
      console.error("Error loading users:", error);
      
      // Fallback to localStorage
      const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
      setUsers(storedUsers);
      
      toast.error("Помилка при завантаженні даних користувачів");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on first render
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const deleteUser = async (userId: string) => {
    await deleteUserAction(userId, users, setUsers, isFounder);
  };

  const changeUserStatus = async (userId: string, newStatus: string) => {
    await changeUserStatusAction(userId, newStatus, users, setUsers, isFounder);
  };

  const toggleShareholderStatus = async (userId: string, isShareHolder: boolean) => {
    await toggleShareholderStatusAction(userId, isShareHolder, users, setUsers, isFounder);
  };

  return {
    users,
    isFounder,
    isLoading,
    deleteUser,
    changeUserStatus,
    toggleShareholderStatus,
    refreshUsers: loadUsers
  };
}
