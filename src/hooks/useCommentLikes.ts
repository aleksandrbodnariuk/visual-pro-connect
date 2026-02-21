import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReactionType } from '@/components/feed/ReactionPicker';
import { useAuth } from '@/context/AuthContext';

export function useCommentLikes(commentId: string) {
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [topReactions, setTopReactions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const userId = user?.id;

  const loadLikes = useCallback(async () => {
    try {
      const { data: likes, error } = await supabase
        .from('comment_likes')
        .select('user_id, reaction_type')
        .eq('comment_id', commentId);

      if (error) throw error;

      if (likes) {
        setLikesCount(likes.length);

        if (userId) {
          const myReaction = likes.find(l => l.user_id === userId);
          setUserReaction(myReaction ? myReaction.reaction_type as ReactionType : null);
        }

        const reactionCounts: Record<string, number> = {};
        likes.forEach(l => {
          reactionCounts[l.reaction_type] = (reactionCounts[l.reaction_type] || 0) + 1;
        });
        const sorted = Object.entries(reactionCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([type]) => type);
        setTopReactions(sorted);
      }
    } catch (error) {
      console.error('Error loading comment likes:', error);
    }
  }, [commentId, userId]);

  useEffect(() => {
    loadLikes();
  }, [loadLikes]);

  // Realtime only — no polling
  useEffect(() => {
    const channelName = `comment_likes_${commentId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'comment_likes',
        filter: `comment_id=eq.${commentId}`
      }, () => {
        loadLikes();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [commentId, loadLikes]);

  const toggleReaction = async (reactionType: ReactionType) => {
    if (isLoading || !userId) return;
    setIsLoading(true);

    try {
      if (userReaction === reactionType) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', userId);
        setUserReaction(null);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else if (userReaction) {
        await supabase
          .from('comment_likes')
          .update({ reaction_type: reactionType })
          .eq('comment_id', commentId)
          .eq('user_id', userId);
        setUserReaction(reactionType);
      } else {
        await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: userId, reaction_type: reactionType });
        setUserReaction(reactionType);
        setLikesCount(prev => prev + 1);
      }

      setTimeout(loadLikes, 200);
    } catch (error) {
      console.error('Error toggling comment reaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { userReaction, likesCount, topReactions, toggleReaction, isLoading };
}
