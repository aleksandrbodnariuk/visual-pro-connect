import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export function ThemeSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user: authUser } = useAuth();

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = async (newTheme: string) => {
    setIsSaving(true);
    setTheme(newTheme);
    
    try {
      if (authUser?.id) {
        const { error } = await supabase
          .from('users')
          .update({ theme: newTheme })
          .eq('id', authUser.id);
        
        if (error) throw error;
        toast.success('Тему змінено');
      }
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Помилка при збереженні теми');
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) {
    return null;
  }

  const currentTheme = resolvedTheme || theme;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Тема оформлення</CardTitle>
        <CardDescription>
          Оберіть зовнішній вигляд додатку. Тема зберігається для вашого профілю.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleThemeChange('light')}
            className={`relative flex flex-col items-center gap-4 p-6 rounded-xl border-2 transition-all ${
              currentTheme === 'light'
                ? 'border-primary bg-primary/10'
                : 'border-input hover:border-muted-foreground/30 hover:bg-muted/50'
            }`}
          >
            <div className="p-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <Sun className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Світла тема</p>
              <p className="text-sm text-muted-foreground">Класичний світлий інтерфейс</p>
            </div>
            {currentTheme === 'light' && (
              <div className="absolute top-3 right-3 p-1 rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </div>
            )}
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleThemeChange('dark')}
            className={`relative flex flex-col items-center gap-4 p-6 rounded-xl border-2 transition-all ${
              currentTheme === 'dark'
                ? 'border-primary bg-primary/10'
                : 'border-input hover:border-muted-foreground/30 hover:bg-muted/50'
            }`}
          >
            <div className="p-4 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
              <Moon className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Темна тема</p>
              <p className="text-sm text-muted-foreground">Зменшує навантаження на очі</p>
            </div>
            {currentTheme === 'dark' && (
              <div className="absolute top-3 right-3 p-1 rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </div>
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
