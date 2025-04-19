
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCategories() {
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const updateUserCategories = async (categories: string[]) => {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) return;

    const { error } = await supabase
      .from('users')
      .update({ categories })
      .eq('id', currentUser.user.id);

    if (error) {
      toast.error('Помилка при оновленні категорій');
      return;
    }

    setUserCategories(categories);
    toast.success('Категорії успішно оновлено');
  };

  useEffect(() => {
    const fetchUserCategories = async () => {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const { data, error } = await supabase
        .from('users')
        .select('categories')
        .eq('id', currentUser.user.id)
        .single();

      if (error) {
        toast.error('Помилка при завантаженні категорій');
        return;
      }

      setUserCategories(data?.categories || []);
      setIsLoading(false);
    };

    fetchUserCategories();
  }, []);

  return {
    userCategories,
    isLoading,
    updateUserCategories
  };
}
