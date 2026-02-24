
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User as AppUser } from '@/hooks/users/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  appUser: AppUser | null;
  signUp: (email: string, password: string, metadata?: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<any>;
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fetch profile from RPC and map to AppUser
async function fetchAppUser(): Promise<AppUser | null> {
  try {
    const { data, error } = await supabase.rpc('get_my_profile');
    if (error) {
      console.error('Error fetching app user:', error);
      return null;
    }
    let profile = data?.[0];
    if (!profile) {
      const { data: newData, error: createError } = await supabase.rpc('ensure_user_profile');
      if (createError) { console.error('Error creating profile:', createError); return null; }
      profile = newData?.[0];
    }
    if (!profile) return null;

    return {
      id: profile.id,
      firstName: profile.full_name?.split(' ')[0] || '',
      lastName: profile.full_name?.split(' ').slice(1).join(' ') || '',
      phoneNumber: profile.phone_number || '',
      isAdmin: !!profile.is_admin,
      founder_admin: !!profile.founder_admin,
      isShareHolder: !!profile.is_shareholder,
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
    console.error('Error in fetchAppUser:', error);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  // Safety timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth timeout - proceeding without session');
        setLoading(false);
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer to avoid deadlock in auth callback
          setTimeout(async () => {
            const userData = await fetchAppUser();
            setAppUser(userData);
            setLoading(false);
          }, 0);
        } else {
          setAppUser(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        setLoading(false);
      }
      // If session exists, the onAuthStateChange listener already fired and will load appUser
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshAppUser = useCallback(async () => {
    const userData = await fetchAppUser();
    setAppUser(userData);
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/`, data: metadata }
      });
      return { data, error };
    } catch (error) { return { data: null, error }; }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      return { data, error };
    } catch (error) { return { data: null, error }; }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      localStorage.removeItem('currentUser');
      return { error };
    } catch (error) { return { error }; }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      isAuthenticated: !!session?.user,
      appUser,
      signUp, signIn, signOut,
      refreshAppUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
