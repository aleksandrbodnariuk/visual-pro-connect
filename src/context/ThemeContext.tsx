import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [defaultTheme, setDefaultTheme] = useState<string>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserTheme = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('users')
            .select('theme')
            .eq('id', user.id)
            .single();
          
          if (data?.theme) {
            setDefaultTheme(data.theme);
          }
        }
      } catch (error) {
        console.error('Error loading user theme:', error);
      } finally {
        setIsLoading(false);
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
          .single();
        
        if (data?.theme) {
          setDefaultTheme(data.theme);
        }
      } else if (event === 'SIGNED_OUT') {
        setDefaultTheme('light');
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme={defaultTheme}
      enableSystem={false}
      storageKey="theme"
    >
      {children}
    </NextThemesProvider>
  );
}
