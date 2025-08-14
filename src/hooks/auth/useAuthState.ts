
import { useCallback } from 'react';
import { useSupabaseAuth } from './useSupabaseAuth';
import { User } from '@/hooks/users/types';

// Legacy hook - redirects to new Supabase auth
export function useAuthState() {
  const { isAuthenticated, getCurrentUser: getSupabaseUser, signOut } = useSupabaseAuth();

  // Перевіряє чи користувач увійшов в систему
  const checkAuthStatus = useCallback(() => {
    return isAuthenticated();
  }, [isAuthenticated]);

  // Отримує поточного користувача (backward compatibility)
  const getCurrentUser = useCallback((): User | null => {
    return getSupabaseUser();
  }, [getSupabaseUser]);

  // Синхронізує користувача з Supabase (no longer needed)
  const syncUser = useCallback(async () => {
    // No longer needed with Supabase auth
    return;
  }, []);

  // Оновлює дані користувача (deprecated - use updateProfile from useSupabaseAuth)
  const updateUser = useCallback(async (userData: Partial<User>) => {
    console.warn('updateUser is deprecated, use updateProfile from useSupabaseAuth');
    return null;
  }, []);

  // Виконує вихід користувача з системи
  const logout = useCallback(async () => {
    const { error } = await signOut();
    return !error;
  }, [signOut]);

  return {
    checkAuthStatus,
    getCurrentUser,
    syncUser,
    updateUser,
    logout
  };
}
