
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
                            (currentUser.phoneNumber === "0507068007");
      
      setIsFounder(isFounderAdmin);
      
      // Try to get data from Supabase first
      const { data: supabaseUsers, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching users from Supabase:", error);
        throw error;
      }
      
      if (supabaseUsers && supabaseUsers.length > 0) {
        console.log("Users loaded from Supabase:", supabaseUsers);
        
        // Make sure founder has correct status
        const updatedUsers = supabaseUsers.map(formatUserFromSupabase);
        
        setUsers(updatedUsers);
        localStorage.setItem("users", JSON.stringify(updatedUsers));
      } else {
        // If no Supabase data, use localStorage
        const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
        
        if (storedUsers.length > 0) {
          console.log("Using users from localStorage:", storedUsers);
          
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
