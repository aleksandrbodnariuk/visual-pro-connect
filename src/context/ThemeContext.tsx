import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Inner component to sync theme with Supabase after mount
function ThemeSyncer() {
  const { setTheme } = useTheme();
  const { user, loading, appUser } = useAuth();

  useEffect(() => {
    if (loading || !user) return;

    // If appUser is loaded, we can try to get theme from users table
    // This runs once when appUser is available
    const loadTheme = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('theme')
          .eq('id', user.id)
          .maybeSingle();

        if (data?.theme) {
          setTheme(data.theme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };

    loadTheme();
  }, [user?.id, loading, setTheme]); // Only re-run when user ID changes, not on every appUser update

  return null;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="light"
      enableSystem={false}
      storageKey="theme"
    >
      <ThemeSyncer />
      {children}
    </NextThemesProvider>
  );
}
