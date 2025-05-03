
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/hooks/users/types';
import { syncUserToSupabase } from '@/hooks/users/usersSync';

export function useAuthState() {
  // Перевіряє чи користувач увійшов в систему
  const checkAuthStatus = useCallback(() => {
    const currentUserJSON = localStorage.getItem('currentUser');
    return !!currentUserJSON;
  }, []);

  // Отримує поточного користувача
  const getCurrentUser = useCallback((): User | null => {
    try {
      const currentUserJSON = localStorage.getItem('currentUser');
      if (!currentUserJSON) return null;
      
      return JSON.parse(currentUserJSON);
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }, []);

  // Синхронізує користувача з Supabase
  const syncUser = useCallback(async () => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      await syncUserToSupabase(currentUser);
    }
  }, [getCurrentUser]);

  // Оновлює дані користувача і в локальному сховищі, і в Supabase
  const updateUser = useCallback(async (userData: Partial<User>) => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) return null;
      
      const updatedUser = {
        ...currentUser,
        ...userData
      };
      
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      await syncUserToSupabase(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      return null;
    }
  }, [getCurrentUser]);

  // Виконує вихід користувача з системи
  const logout = useCallback(() => {
    localStorage.removeItem('currentUser');
    return true;
  }, []);

  return {
    checkAuthStatus,
    getCurrentUser,
    syncUser,
    updateUser,
    logout
  };
}
