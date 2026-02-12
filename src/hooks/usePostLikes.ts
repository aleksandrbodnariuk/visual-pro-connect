import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ReactionType } from '@/components/feed/ReactionPicker';

export function usePostLikes(postId: string, initialLikesCount: number) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [reactionType, setReactionType] = useState<ReactionType | null>(null);
  const [topReactions, setTopReactions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkIfLiked = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('post_likes')
        .select('id, reaction_type')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setLiked(true);
        setReactionType((data.reaction_type || 'like') as ReactionType);
      }
    };

    checkIfLiked();
    loadTopReactions();
  }, [postId]);

  const loadTopReactions = async () => {
    const { data } = await supabase
      .from('post_likes')
      .select('reaction_type')
      .eq('post_id', postId);

    if (data && data.length > 0) {
      const counts: Record<string, number> = {};
      data.forEach(l => {
        const rt = l.reaction_type || 'like';
        counts[rt] = (counts[rt] || 0) + 1;
      });
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type);
      setTopReactions(sorted);
    }
  };

  // Підписка на зміни лайків
  useEffect(() => {
    const channel = supabase
      .channel(`post_likes_${postId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'post_likes',
        filter: `post_id=eq.${postId}`
      }, async () => {
        const { data } = await supabase
          .from('posts')
          .select('likes_count')
          .eq('id', postId)
          .single();
        if (data) setLikesCount(data.likes_count);
        loadTopReactions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [postId]);

  const toggleLike = async () => {
    await toggleReaction(reactionType || 'like');
  };

  const toggleReaction = async (newReaction: ReactionType) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Потрібно авторизуватися"); return; }

      if (liked && reactionType === newReaction) {
        // Remove
        await supabase.from('post_likes').delete()
          .eq('post_id', postId).eq('user_id', user.id);
        setLiked(false);
        setReactionType(null);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else if (liked) {
        // Update reaction type
        await supabase.from('post_likes').update({ reaction_type: newReaction })
          .eq('post_id', postId).eq('user_id', user.id);
        setReactionType(newReaction);
      } else {
        // Add
        await supabase.from('post_likes').insert([{
          post_id: postId, user_id: user.id, reaction_type: newReaction
        }]);
        setLiked(true);
        setReactionType(newReaction);
        setLikesCount(prev => prev + 1);
      }
      setTimeout(loadTopReactions, 200);
    } catch (error) {
      console.error("Error toggling reaction:", error);
      toast.error("Помилка при роботі з реакцією");
    } finally {
      setIsLoading(false);
    }
  };

  return { liked, likesCount, toggleLike, isLoading, reactionType, topReactions, toggleReaction };
}
