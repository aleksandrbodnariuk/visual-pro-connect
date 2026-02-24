
import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User } from '@/hooks/users/types';

// Legacy hook - reads from AuthContext (single source of truth)
export function useSupabaseAuth() {
  const { user, session, loading, isAuthenticated, appUser, signUp, signIn, signOut, refreshAppUser } = useAuth();

  const isAuthenticatedFn = useCallback(() => isAuthenticated, [isAuthenticated]);
  const getCurrentUser = useCallback((): User | null => appUser as User | null, [appUser]);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!user) return { error: 'No user logged in' };
    try {
      const fullName = updates.firstName && updates.lastName ?
        `${updates.firstName} ${updates.lastName}` :
        updates.firstName || updates.lastName;

      if (fullName || updates.phoneNumber) {
        const { error: authError } = await (await import('@/integrations/supabase/client')).supabase.auth.updateUser({
          data: { full_name: fullName, phone: updates.phoneNumber }
        });
        if (authError) return { error: authError };
      }

      const { error } = await (await import('@/integrations/supabase/client')).supabase
        .from('users').update(updates).eq('id', user.id);
      if (error) return { error };

      await refreshAppUser();
      return { error: null };
    } catch (error) { return { error }; }
  }, [user, refreshAppUser]);

  return {
    user, session, appUser, loading,
    signUp, signIn, signOut,
    isAuthenticated: isAuthenticatedFn,
    getCurrentUser,
    updateProfile,
    getAppUser: refreshAppUser,
  };
}
