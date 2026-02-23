
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export function useCategories() {
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const updateUserCategories = async (categories: string[]) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('users')
      .update({ categories })
      .eq('id', user.id);

    if (error) {
      toast.error('Помилка при оновленні категорій');
      return;
    }

    setUserCategories(categories);
    toast.success('Категорії успішно оновлено');
  };

  useEffect(() => {
    if (!user?.id) return;

    const fetchUserCategories = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('categories')
        .eq('id', user.id)
        .single();

      if (error) {
        toast.error('Помилка при завантаженні категорій');
        return;
      }

      setUserCategories(data?.categories || []);
      setIsLoading(false);
    };

    fetchUserCategories();
  }, [user?.id]);

  return {
    userCategories,
    isLoading,
    updateUserCategories
  };
}
