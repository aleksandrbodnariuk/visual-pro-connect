import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReactionType } from '@/components/feed/ReactionPicker';

export function useCommentLikes(commentId: string) {
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [topReactions, setTopReactions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadLikes();
  }, [commentId]);

  // Realtime підписка на лайки коментарів
  useEffect(() => {
    const channelName = `realtime_comment_likes_${commentId}_${Math.random().toString(36).substring(7)}`;
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
  }, [commentId]);

  // Фоновий polling як резервний механізм (кожні 5 сек)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadLikes();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [commentId]);

  const loadLikes = async () => {
    try {
      // Get all likes for this comment
      const { data: likes, error } = await supabase
        .from('comment_likes')
        .select('user_id, reaction_type')
        .eq('comment_id', commentId);

      if (error) throw error;

      if (likes) {
        setLikesCount(likes.length);

        // Find current user's reaction
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const myReaction = likes.find(l => l.user_id === user.id);
          setUserReaction(myReaction ? myReaction.reaction_type as ReactionType : null);
        }

        // Get top reaction types
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
  };

  const toggleReaction = async (reactionType: ReactionType) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (userReaction === reactionType) {
        // Remove reaction
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
        setUserReaction(null);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else if (userReaction) {
        // Update reaction
        await supabase
          .from('comment_likes')
          .update({ reaction_type: reactionType })
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
        setUserReaction(reactionType);
      } else {
        // Add reaction
        await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: user.id, reaction_type: reactionType });
        setUserReaction(reactionType);
        setLikesCount(prev => prev + 1);
      }

      // Reload to get accurate top reactions
      setTimeout(loadLikes, 200);
    } catch (error) {
      console.error('Error toggling comment reaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { userReaction, likesCount, topReactions, toggleReaction, isLoading };
}
