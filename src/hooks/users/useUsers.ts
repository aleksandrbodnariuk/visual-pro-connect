
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
      
      // Verify admin access before fetching sensitive data
      const { data: adminCheck } = await supabase.rpc('check_admin_access');
      
      let supabaseUsers = null;
      let fetchError = null;
      
      if (adminCheck) {
        // Only admins can access full user data
        const { data, error } = await supabase.rpc('get_users_for_admin');
        supabaseUsers = data;
        fetchError = error;
      } else {
        // Non-admins get safe public profiles only
        const { data, error } = await supabase.rpc('get_safe_public_profiles');
        supabaseUsers = data;
        fetchError = error;
      }
      
      if (fetchError) {
        console.error("Error fetching users from Supabase:", fetchError);
        throw fetchError;
      }
      
      if (supabaseUsers && supabaseUsers.length > 0) {
        console.log("Users loaded from Supabase:", supabaseUsers);
        
        // Make sure founder has correct status
        const updatedUsers = supabaseUsers.map(user => {
          if (user.phone_number === "0507068007") {
            // Founder status is managed by database triggers and functions
            // No need to manually update here
            
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
    await deleteUserAction(userId);
    // Reload users after deletion
    loadUsers();
  };

  const changeUserStatus = async (userId: string, newStatus: string) => {
    await changeUserStatusAction(userId, newStatus);
    // Reload users after status change
    loadUsers();
  };

  const toggleShareholderStatus = async (userId: string, isShareHolder: boolean) => {
    await toggleShareholderStatusAction(userId, isShareHolder);
    // Reload users after shareholder status change
    loadUsers();
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
