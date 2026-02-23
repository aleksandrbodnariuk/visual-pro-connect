import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { ReactionType } from '@/components/feed/ReactionPicker';
import { toast } from 'sonner';

export interface FeedComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  likes_count: number;
  user?: { id: string; full_name: string; avatar_url: string };
  replies?: FeedComment[];
}

export interface CommentLikesData {
  likesCount: number;
  userReaction: ReactionType | null;
  topReactions: string[];
}

export interface PostLikesData {
  liked: boolean;
  likesCount: number;
  reactionType: ReactionType | null;
  topReactions: string[];
}

export interface ProfileData {
  id: string;
  full_name: string;
  avatar_url: string;
  title?: string;
  bio?: string;
  is_shareholder?: boolean;
}

export interface PostShareData {
  shared: boolean;
  isLoading: boolean;
}

/**
 * Centralized feed data hook.
 * Loads ALL comments, comment_likes, post_likes, post_shares, and profiles
 * in batch queries at the NewsFeed level. No child component should fetch.
 */
export function useFeedData(postIds: string[]) {
  const { user } = useAuth();
  const userId = user?.id;

  // Data stores
  const [commentsMap, setCommentsMap] = useState<Map<string, FeedComment[]>>(new Map());
  const [commentLikesMap, setCommentLikesMap] = useState<Map<string, CommentLikesData>>(new Map());
  const [postLikesMap, setPostLikesMap] = useState<Map<string, PostLikesData>>(new Map());
  const [postSharesMap, setPostSharesMap] = useState<Map<string, boolean>>(new Map());
  const [profilesMap, setProfilesMap] = useState<Map<string, ProfileData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState<Set<string>>(new Set());

  // Track action loading states
  const [postLikeLoading, setPostLikeLoading] = useState<Set<string>>(new Set());
  const [commentLikeLoading, setCommentLikeLoading] = useState(false);

  const idsKey = postIds.join(',');

  // ============ BATCH LOAD ALL DATA ============
  const loadAllData = useCallback(async () => {
    if (postIds.length === 0) return;
    setIsLoading(true);

    try {
      // 1) Load ALL comments for all posts in ONE query
      const { data: allComments, error: commErr } = await supabase
        .from('comments')
        .select('*')
        .in('post_id', postIds)
        .order('created_at', { ascending: true });

      if (commErr) throw commErr;

      const comments = (allComments || []) as FeedComment[];

      // Collect all user IDs (post authors already handled by NewsFeed, but comment authors needed)
      const commentUserIds = [...new Set(comments.map(c => c.user_id))];

      // 2) Load ALL comment_likes in ONE query
      const commentIds = comments.map(c => c.id);
      let allCommentLikes: any[] = [];
      if (commentIds.length > 0) {
        const { data: clData } = await supabase
          .from('comment_likes')
          .select('comment_id, user_id, reaction_type')
          .in('comment_id', commentIds);
        allCommentLikes = clData || [];
      }

      // 3) Load ALL post_likes in ONE query
      const { data: allPostLikes } = await supabase
        .from('post_likes')
        .select('post_id, user_id, reaction_type')
        .in('post_id', postIds);

      // 3b) Load ALL post_shares for current user in ONE query
      let userSharePostIds: Set<string> = new Set();
      if (userId) {
        const { data: sharesData } = await supabase
          .from('post_shares')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', postIds);
        (sharesData || []).forEach(s => userSharePostIds.add(s.post_id));
      }

      // 4) Load ALL profiles in ONE RPC call
      const allUserIds = [...new Set([...commentUserIds])];
      let profiles: ProfileData[] = [];
      if (allUserIds.length > 0) {
        const { data: profData } = await supabase.rpc('get_safe_public_profiles_by_ids', {
          _ids: allUserIds
        });
        profiles = (profData || []) as ProfileData[];
      }

      // ---- Build profiles map ----
      const pMap = new Map<string, ProfileData>();
      profiles.forEach(p => pMap.set(p.id, p));
      setProfilesMap(pMap);

      // ---- Build comments map (grouped by post_id, with user data) ----
      const cMap = new Map<string, FeedComment[]>();
      postIds.forEach(pid => cMap.set(pid, []));
      comments.forEach(c => {
        const enriched: FeedComment = {
          ...c,
          parent_id: c.parent_id || null,
          user: pMap.get(c.user_id) ? {
            id: pMap.get(c.user_id)!.id,
            full_name: pMap.get(c.user_id)!.full_name,
            avatar_url: pMap.get(c.user_id)!.avatar_url,
          } : undefined,
        };
        const list = cMap.get(c.post_id) || [];
        list.push(enriched);
        cMap.set(c.post_id, list);
      });
      setCommentsMap(cMap);

      // ---- Build comment_likes map ----
      const clMap = new Map<string, CommentLikesData>();
      commentIds.forEach(cid => clMap.set(cid, { likesCount: 0, userReaction: null, topReactions: [] }));
      if (allCommentLikes.length > 0) {
        const grouped: Record<string, typeof allCommentLikes> = {};
        allCommentLikes.forEach(l => {
          if (!grouped[l.comment_id]) grouped[l.comment_id] = [];
          grouped[l.comment_id].push(l);
        });
        for (const [cid, likes] of Object.entries(grouped)) {
          const entry: CommentLikesData = {
            likesCount: likes.length,
            userReaction: null,
            topReactions: [],
          };
          if (userId) {
            const my = likes.find(l => l.user_id === userId);
            entry.userReaction = my ? (my.reaction_type as ReactionType) : null;
          }
          const counts: Record<string, number> = {};
          likes.forEach(l => { counts[l.reaction_type] = (counts[l.reaction_type] || 0) + 1; });
          entry.topReactions = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
          clMap.set(cid, entry);
        }
      }
      setCommentLikesMap(clMap);

      // ---- Build post_likes map ----
      const plMap = new Map<string, PostLikesData>();
      postIds.forEach(pid => plMap.set(pid, { liked: false, likesCount: 0, reactionType: null, topReactions: [] }));
      if (allPostLikes && allPostLikes.length > 0) {
        const grouped: Record<string, typeof allPostLikes> = {};
        (allPostLikes).forEach(l => {
          if (!grouped[l.post_id]) grouped[l.post_id] = [];
          grouped[l.post_id].push(l);
        });
        for (const [pid, likes] of Object.entries(grouped)) {
          const entry: PostLikesData = {
            liked: false,
            likesCount: likes.length,
            reactionType: null,
            topReactions: [],
          };
          if (userId) {
            const my = likes.find(l => l.user_id === userId);
            if (my) {
              entry.liked = true;
              entry.reactionType = (my.reaction_type || 'like') as ReactionType;
            }
          }
          const counts: Record<string, number> = {};
          likes.forEach(l => { const rt = l.reaction_type || 'like'; counts[rt] = (counts[rt] || 0) + 1; });
          entry.topReactions = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
          plMap.set(pid, entry);
        }
      }
      setPostLikesMap(plMap);

      // ---- Build post_shares map ----
      const psMap = new Map<string, boolean>();
      postIds.forEach(pid => psMap.set(pid, userSharePostIds.has(pid)));
      setPostSharesMap(psMap);
    } catch (error) {
      console.error('Error loading feed data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [idsKey, userId]);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ============ REALTIME: 1 channel for comments ============
  useEffect(() => {
    if (postIds.length === 0) return;
    const ch = supabase
      .channel(`feed_comments_${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
        const pid = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
        if (pid && postIds.includes(pid)) {
          loadAllData();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [idsKey, loadAllData]);

  // ============ REALTIME: 1 channel for comment_likes ============
  useEffect(() => {
    if (postIds.length === 0) return;
    const ch = supabase
      .channel(`feed_comment_likes_${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_likes' }, (payload) => {
        const cid = (payload.new as any)?.comment_id || (payload.old as any)?.comment_id;
        if (cid && commentLikesMap.has(cid)) {
          loadAllData();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [idsKey, loadAllData]);

  // ============ REALTIME: 1 channel for post_likes ============
  useEffect(() => {
    if (postIds.length === 0) return;
    const ch = supabase
      .channel(`feed_post_likes_${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, (payload) => {
        const pid = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
        if (pid && postIds.includes(pid)) {
          loadAllData();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [idsKey, loadAllData]);

  // ============ ACTIONS ============

  const togglePostReaction = async (postId: string, newReaction: ReactionType) => {
    if (!userId) { toast.error("Потрібно авторизуватися"); return; }

    setPostLikeLoading(prev => new Set(prev).add(postId));
    try {
      const current = postLikesMap.get(postId);
      if (current?.liked && current.reactionType === newReaction) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
        setPostLikesMap(prev => {
          const m = new Map(prev);
          m.set(postId, { ...current, liked: false, reactionType: null, likesCount: Math.max(0, current.likesCount - 1) });
          return m;
        });
      } else if (current?.liked) {
        await supabase.from('post_likes').update({ reaction_type: newReaction }).eq('post_id', postId).eq('user_id', userId);
        setPostLikesMap(prev => {
          const m = new Map(prev);
          m.set(postId, { ...current, reactionType: newReaction });
          return m;
        });
      } else {
        await supabase.from('post_likes').insert([{ post_id: postId, user_id: userId, reaction_type: newReaction }]);
        setPostLikesMap(prev => {
          const m = new Map(prev);
          const c = prev.get(postId) || { liked: false, likesCount: 0, reactionType: null, topReactions: [] };
          m.set(postId, { ...c, liked: true, reactionType: newReaction, likesCount: c.likesCount + 1 });
          return m;
        });
      }
      // Realtime will handle full refresh of topReactions
    } catch (error) {
      console.error("Error toggling post reaction:", error);
      toast.error("Помилка при роботі з реакцією");
    } finally {
      setPostLikeLoading(prev => { const s = new Set(prev); s.delete(postId); return s; });
    }
  };

  const toggleCommentReaction = async (commentId: string, reactionType: ReactionType) => {
    if (!userId || commentLikeLoading) return;
    setCommentLikeLoading(true);
    try {
      const current = commentLikesMap.get(commentId);
      if (current?.userReaction === reactionType) {
        await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId);
      } else if (current?.userReaction) {
        await supabase.from('comment_likes').update({ reaction_type: reactionType }).eq('comment_id', commentId).eq('user_id', userId);
      } else {
        await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId, reaction_type: reactionType });
      }
      // Realtime handles refresh
    } catch (error) {
      console.error('Error toggling comment reaction:', error);
    } finally {
      setCommentLikeLoading(false);
    }
  };

  // ============ SHARE ACTION ============
  const toggleShare = async (postId: string) => {
    if (!userId) { toast.error("Потрібно авторизуватися"); return; }
    setShareLoading(prev => new Set(prev).add(postId));
    try {
      const isShared = postSharesMap.get(postId) || false;
      if (isShared) {
        await supabase.from('post_shares').delete().eq('post_id', postId).eq('user_id', userId);
        setPostSharesMap(prev => { const m = new Map(prev); m.set(postId, false); return m; });
        toast.success("Репост скасовано");
      } else {
        await supabase.from('post_shares').insert([{ post_id: postId, user_id: userId }]);
        setPostSharesMap(prev => { const m = new Map(prev); m.set(postId, true); return m; });
        toast.success("Публікація поширена!");
      }
    } catch (error) {
      console.error("Error toggling share:", error);
      toast.error("Помилка при роботі з репостом");
    } finally {
      setShareLoading(prev => { const s = new Set(prev); s.delete(postId); return s; });
    }
  };

  // ============ GETTERS ============

  const getCommentsForPost = useCallback((postId: string): FeedComment[] => {
    return commentsMap.get(postId) || [];
  }, [commentsMap]);

  const getCommentLikes = useCallback((commentId: string): CommentLikesData => {
    return commentLikesMap.get(commentId) || { likesCount: 0, userReaction: null, topReactions: [] };
  }, [commentLikesMap]);

  const getPostLikes = useCallback((postId: string): PostLikesData => {
    return postLikesMap.get(postId) || { liked: false, likesCount: 0, reactionType: null, topReactions: [] };
  }, [postLikesMap]);

  const getProfile = useCallback((userId: string): ProfileData | undefined => {
    return profilesMap.get(userId);
  }, [profilesMap]);

  const getPostShare = useCallback((postId: string): PostShareData => {
    return { shared: postSharesMap.get(postId) || false, isLoading: shareLoading.has(postId) };
  }, [postSharesMap, shareLoading]);

  return {
    isLoading,
    getCommentsForPost,
    getCommentLikes,
    getPostLikes,
    getPostShare,
    getProfile,
    togglePostReaction,
    toggleCommentReaction,
    toggleShare,
    postLikeLoading,
    commentLikeLoading,
    reload: loadAllData,
  };
}
