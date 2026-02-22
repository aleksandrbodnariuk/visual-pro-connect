import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReactionType } from '@/components/feed/ReactionPicker';
import { useAuth } from '@/context/AuthContext';

export interface CommentLikesData {
  likesCount: number;
  userReaction: ReactionType | null;
  topReactions: string[];
}

/**
 * Batch hook: loads all comment_likes for a list of commentIds in ONE query.
 * Replaces individual useCommentLikes per comment (N+1 problem).
 */
export function useCommentLikesBatch(commentIds: string[]) {
  const [likesMap, setLikesMap] = useState<Map<string, CommentLikesData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const userId = user?.id;
  
  // Stable reference for commentIds to avoid unnecessary re-renders
  const idsKey = commentIds.join(',');

  const loadBatch = useCallback(async () => {
    if (commentIds.length === 0) {
      setLikesMap(new Map());
      return;
    }

    try {
      const { data, error } = await supabase
        .from('comment_likes')
        .select('comment_id, user_id, reaction_type')
        .in('comment_id', commentIds);

      if (error) throw error;

      const map = new Map<string, CommentLikesData>();

      // Initialize all with defaults
      commentIds.forEach(id => map.set(id, { likesCount: 0, userReaction: null, topReactions: [] }));

      if (data && data.length > 0) {
        // Group by comment_id
        const grouped: Record<string, typeof data> = {};
        data.forEach(like => {
          if (!grouped[like.comment_id]) grouped[like.comment_id] = [];
          grouped[like.comment_id].push(like);
        });

        for (const [cid, likes] of Object.entries(grouped)) {
          const entry: CommentLikesData = {
            likesCount: likes.length,
            userReaction: null,
            topReactions: [],
          };

          if (userId) {
            const myLike = likes.find(l => l.user_id === userId);
            entry.userReaction = myLike ? (myLike.reaction_type as ReactionType) : null;
          }

          // Top 3 reaction types
          const counts: Record<string, number> = {};
          likes.forEach(l => {
            counts[l.reaction_type] = (counts[l.reaction_type] || 0) + 1;
          });
          entry.topReactions = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([type]) => type);

          map.set(cid, entry);
        }
      }

      setLikesMap(map);
    } catch (error) {
      console.error('Error batch loading comment likes:', error);
    }
  }, [idsKey, userId]);

  // Initial load
  useEffect(() => {
    loadBatch();
  }, [loadBatch]);

  // Single realtime subscription for ALL comment_likes changes
  // We subscribe to the whole table and check if the changed comment_id is in our set
  useEffect(() => {
    if (commentIds.length === 0) return;

    const channelName = `batch_comment_likes_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comment_likes',
      }, (payload) => {
        // Check if this change is relevant to our comment set
        const changedCommentId = (payload.new as any)?.comment_id || (payload.old as any)?.comment_id;
        if (changedCommentId && commentIds.includes(changedCommentId)) {
          loadBatch();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [idsKey, loadBatch]);

  const toggleReaction = async (commentId: string, reactionType: ReactionType) => {
    if (isLoading || !userId) return;
    setIsLoading(true);

    try {
      const current = likesMap.get(commentId);
      const currentReaction = current?.userReaction;

      if (currentReaction === reactionType) {
        // Remove reaction
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', userId);
      } else if (currentReaction) {
        // Change reaction type
        await supabase
          .from('comment_likes')
          .update({ reaction_type: reactionType })
          .eq('comment_id', commentId)
          .eq('user_id', userId);
      } else {
        // New reaction
        await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: userId, reaction_type: reactionType });
      }

      // Reload batch after a short delay for DB to settle
      setTimeout(loadBatch, 200);
    } catch (error) {
      console.error('Error toggling comment reaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLikes = (commentId: string): CommentLikesData => {
    return likesMap.get(commentId) || { likesCount: 0, userReaction: null, topReactions: [] };
  };

  return { getLikes, toggleReaction, isLoading, reloadLikes: loadBatch };
}
