import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePostShares(postId: string) {
  const [shared, setShared] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Перевіряємо, чи користувач вже зробив репост
  useEffect(() => {
    const checkIfShared = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('post_shares')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setShared(true);
      }
    };

    checkIfShared();
  }, [postId]);

  const toggleShare = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Потрібно авторизуватися");
        return;
      }

      if (shared) {
        // Видаляємо репост
        const { error } = await supabase
          .from('post_shares')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;

        setShared(false);
        toast.success("Репост скасовано");
      } else {
        // Додаємо репост
        const { error } = await supabase
          .from('post_shares')
          .insert([{
            post_id: postId,
            user_id: user.id
          }]);

        if (error) throw error;

        setShared(true);
        toast.success("Публікація поширена!");
      }
    } catch (error) {
      console.error("Error toggling share:", error);
      toast.error("Помилка при роботі з репостом");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    shared,
    toggleShare,
    isLoading
  };
}
