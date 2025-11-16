import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePostLikes(postId: string, initialLikesCount: number) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLoading, setIsLoading] = useState(false);

  // Перевіряємо, чи користувач вже поставив лайк
  useEffect(() => {
    const checkIfLiked = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setLiked(true);
      }
    };

    checkIfLiked();
  }, [postId]);

  // Підписуємося на зміни лайків в реальному часі
  useEffect(() => {
    const channel = supabase
      .channel(`post_likes_${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes',
          filter: `post_id=eq.${postId}`
        },
        async () => {
          // Оновлюємо кількість лайків
          const { data, error } = await supabase
            .from('posts')
            .select('likes_count')
            .eq('id', postId)
            .single();

          if (!error && data) {
            setLikesCount(data.likes_count);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const toggleLike = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Потрібно авторизуватися");
        return;
      }

      if (liked) {
        // Видаляємо лайк
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;

        setLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        // Додаємо лайк
        const { error } = await supabase
          .from('post_likes')
          .insert([{
            post_id: postId,
            user_id: user.id
          }]);

        if (error) throw error;

        setLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Помилка при роботі з лайком");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    liked,
    likesCount,
    toggleLike,
    isLoading
  };
}
