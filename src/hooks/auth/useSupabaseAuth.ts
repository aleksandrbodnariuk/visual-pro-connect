import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User as AppUser } from '@/hooks/users/types';

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  // Get app user data from our users table
  const getAppUser = useCallback(async (userId: string): Promise<AppUser | null> => {
    try {
      const { data, error } = await supabase.rpc('get_my_profile');
      if (error) {
        console.error('Error fetching app user:', error);
        return null;
      }
      
      const profile = data?.[0];
      if (!profile) return null;
      
      // Convert to AppUser format
      return {
        id: profile.id,
        firstName: profile.full_name?.split(' ')[0] || '',
        lastName: profile.full_name?.split(' ').slice(1).join(' ') || '',
        phoneNumber: profile.phone_number || '',
        isAdmin: profile.is_admin || false,
        founderAdmin: profile.founder_admin || false,
        isShareHolder: profile.is_shareholder || false,
        createdAt: profile.created_at,
        categories: profile.categories || [],
        avatarUrl: profile.avatar_url || '',
        bio: profile.bio || '',
        website: profile.website || '',
        instagram: profile.instagram || '',
        facebook: profile.facebook || '',
        viber: profile.viber || '',
        bannerUrl: profile.banner_url || '',
        title: profile.title || '',
        country: profile.country || '',
        city: profile.city || ''
      } as AppUser;
    } catch (error) {
      console.error('Error in getAppUser:', error);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch app user data asynchronously
          setTimeout(async () => {
            const userData = await getAppUser(session.user.id);
            setAppUser(userData);
          }, 0);
        } else {
          setAppUser(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        getAppUser(session.user.id).then(setAppUser);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [getAppUser]);

  // Sign up with email/password
  const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata
        }
      });
      
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }, []);

  // Sign in with email/password
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      // Clear localStorage for backward compatibility
      localStorage.removeItem('currentUser');
      
      return { error };
    } catch (error) {
      return { error };
    }
  }, []);

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    return !!session?.user;
  }, [session]);

  // Get current user (backward compatibility)
  const getCurrentUser = useCallback((): AppUser | null => {
    return appUser;
  }, [appUser]);

  // Update user profile
  const updateProfile = useCallback(async (updates: Partial<AppUser>) => {
    if (!user) return { error: 'No user logged in' };

    try {
      // Update auth metadata if needed
      const fullName = updates.firstName && updates.lastName ? 
        `${updates.firstName} ${updates.lastName}` : 
        updates.firstName || updates.lastName;
        
      if (fullName || updates.phoneNumber) {
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            phone: updates.phoneNumber
          }
        });
        
        if (authError) {
          return { error: authError };
        }
      }

      // Update users table
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        return { error };
      }

      // Refresh app user data
      const updatedAppUser = await getAppUser(user.id);
      setAppUser(updatedAppUser);

      return { error: null };
    } catch (error) {
      return { error };
    }
  }, [user, getAppUser]);

  return {
    user,
    session,
    appUser,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated,
    getCurrentUser,
    updateProfile,
    getAppUser
  };
}