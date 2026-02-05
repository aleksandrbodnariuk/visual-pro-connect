import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Inner component to sync theme with Supabase after mount
function ThemeSyncer() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const loadUserTheme = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('users')
            .select('theme')
            .eq('id', user.id)
            .maybeSingle();
          
          if (data?.theme) {
            setTheme(data.theme);
          }
        }
      } catch (error) {
        console.error('Error loading user theme:', error);
      }
    };
    
    loadUserTheme();
    
    // Listen for auth changes to update theme
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data } = await supabase
          .from('users')
          .select('theme')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (data?.theme) {
          setTheme(data.theme);
        }
      } else if (event === 'SIGNED_OUT') {
        setTheme('light');
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [setTheme]);

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
