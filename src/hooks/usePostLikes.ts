import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ReactionType } from '@/components/feed/ReactionPicker';
import { useAuth } from '@/context/AuthContext';

export function usePostLikes(postId: string, initialLikesCount: number) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [reactionType, setReactionType] = useState<ReactionType | null>(null);
  const [topReactions, setTopReactions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const userId = user?.id;

  const loadTopReactions = useCallback(async () => {
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
  }, [postId]);

  useEffect(() => {
    if (!userId) return;

    const checkIfLiked = async () => {
      const { data, error } = await supabase
        .from('post_likes')
        .select('id, reaction_type')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setLiked(true);
        setReactionType((data.reaction_type || 'like') as ReactionType);
      }
    };

    checkIfLiked();
    loadTopReactions();
  }, [postId, userId, loadTopReactions]);

  // Realtime only — no polling
  useEffect(() => {
    const channelName = `post_likes_${postId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'post_likes',
        filter: `post_id=eq.${postId}`
      }, async () => {
        const { count } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId);
        if (count !== null) setLikesCount(count);
        
        if (userId) {
          const { data: myLike } = await supabase
            .from('post_likes')
            .select('reaction_type')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .maybeSingle();
          setLiked(!!myLike);
          setReactionType(myLike ? (myLike.reaction_type as ReactionType) : null);
        }
        
        loadTopReactions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [postId, userId, loadTopReactions]);

  const toggleLike = async () => {
    await toggleReaction(reactionType || 'like');
  };

  const toggleReaction = async (newReaction: ReactionType) => {
    if (!userId) { toast.error("Потрібно авторизуватися"); return; }
    setIsLoading(true);
    try {
      if (liked && reactionType === newReaction) {
        await supabase.from('post_likes').delete()
          .eq('post_id', postId).eq('user_id', userId);
        setLiked(false);
        setReactionType(null);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else if (liked) {
        await supabase.from('post_likes').update({ reaction_type: newReaction })
          .eq('post_id', postId).eq('user_id', userId);
        setReactionType(newReaction);
      } else {
        await supabase.from('post_likes').insert([{
          post_id: postId, user_id: userId, reaction_type: newReaction
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
