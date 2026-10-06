import { useState, useEffect, useCallback, useRef } from 'react';
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
  image_url?: string | null;
  user?: { id: string; full_name: string; avatar_url: string };
  replies?: FeedComment[];
}

export interface CommentLikesData {
  likesCount: number;
  userReaction: ReactionType | null;
  topReactions: string[];
  likerNames: string[];
}

export interface PostLikesData {
  liked: boolean;
  likesCount: number;
  reactionType: ReactionType | null;
  topReactions: string[];
  likerNames: string[];
  currentUserLiked: boolean;
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
  sharesCount: number;
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
  const [shareCountsMap, setShareCountsMap] = useState<Map<string, number>>(new Map());
  const [profilesMap, setProfilesMap] = useState<Map<string, ProfileData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState<Set<string>>(new Set());

  // Track action loading states
  const [postLikeLoading, setPostLikeLoading] = useState<Set<string>>(new Set());
  const [commentLikeLoading, setCommentLikeLoading] = useState<Set<string>>(new Set());

  // Ref to track known comment IDs for realtime filtering (avoids stale closure)
  const knownCommentIdsRef = useRef<Set<string>>(new Set());
  const visiblePostIdsRef = useRef<Set<string>>(new Set(postIds));
  const realtimeTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const idsKey = postIds.join(',');

  useEffect(() => {
    visiblePostIdsRef.current = new Set(postIds);
  }, [idsKey]);

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

      // 3b) Load ALL post_shares (all users for counts + current user check)
      const { data: allSharesData } = await supabase
        .from('post_shares')
        .select('post_id, user_id')
        .in('post_id', postIds);
      const allShares = allSharesData || [];
      let userSharePostIds: Set<string> = new Set();
      const shareCountsByPost: Record<string, number> = {};
      allShares.forEach(s => {
        shareCountsByPost[s.post_id] = (shareCountsByPost[s.post_id] || 0) + 1;
        if (s.user_id === userId) userSharePostIds.add(s.post_id);
      });

      // 4) Load ALL profiles in ONE RPC call (comment users + liker users)
      const likerUserIds = allPostLikes ? [...new Set((allPostLikes).map((l: any) => l.user_id))] : [];
      const commentLikerUserIds = [...new Set(allCommentLikes.map(l => l.user_id))];
      const allUserIds = [...new Set([...commentUserIds, ...likerUserIds, ...commentLikerUserIds])];
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
        const profile = pMap.get(c.user_id);
        const enriched: FeedComment = {
          ...c,
          parent_id: c.parent_id || null,
          user: profile ? {
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          } : undefined,
        };
        const list = cMap.get(c.post_id) || [];
        list.push(enriched);
        cMap.set(c.post_id, list);
      });
      // Update known comment IDs ref
      const allKnownIds = new Set<string>();
      cMap.forEach(list => list.forEach(c => allKnownIds.add(c.id)));
      knownCommentIdsRef.current = allKnownIds;
      setCommentsMap(cMap);

      // ---- Build comment_likes map ----
      const clMap = new Map<string, CommentLikesData>();
      commentIds.forEach(cid => clMap.set(cid, { likesCount: 0, userReaction: null, topReactions: [], likerNames: [] }));
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
            likerNames: likes.map(l => pMap.get(l.user_id)?.full_name || '').filter(Boolean),
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
      postIds.forEach(pid => plMap.set(pid, { liked: false, likesCount: 0, reactionType: null, topReactions: [], likerNames: [], currentUserLiked: false }));
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
            likerNames: [],
            currentUserLiked: false,
          };
          if (userId) {
            const my = likes.find(l => l.user_id === userId);
            if (my) {
              entry.liked = true;
              entry.currentUserLiked = true;
              entry.reactionType = (my.reaction_type || 'like') as ReactionType;
            }
          }
          // Get ALL liker names (excluding current user) for tooltip; summary shows first 2
          const otherLikers = likes.filter(l => l.user_id !== userId);
          entry.likerNames = otherLikers
            .map(l => pMap.get(l.user_id)?.full_name || '')
            .filter(Boolean);
          
          const counts: Record<string, number> = {};
          likes.forEach(l => { const rt = l.reaction_type || 'like'; counts[rt] = (counts[rt] || 0) + 1; });
          entry.topReactions = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
          plMap.set(pid, entry);
        }
      }
      setPostLikesMap(plMap);

      // ---- Build post_shares map ----
      const psMap = new Map<string, boolean>();
      const scMap = new Map<string, number>();
      postIds.forEach(pid => {
        psMap.set(pid, userSharePostIds.has(pid));
        scMap.set(pid, shareCountsByPost[pid] || 0);
      });
      setPostSharesMap(psMap);
      setShareCountsMap(scMap);
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

  const refreshPostLikes = useCallback(async (postId: string) => {
    if (!visiblePostIdsRef.current.has(postId)) return;
    const { data, error } = await supabase
      .from('post_likes')
      .select('user_id, reaction_type')
      .eq('post_id', postId);
    if (error) return;

    const likes = data || [];
    const otherUserIds = [...new Set(likes.map(like => like.user_id).filter(id => id && id !== userId))];
    let namesById = new Map<string, string>();
    if (otherUserIds.length > 0) {
      const { data: profiles } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: otherUserIds });
      namesById = new Map((profiles || []).map(profile => [profile.id, profile.full_name]));
    }
    const myReaction = userId ? likes.find(like => like.user_id === userId)?.reaction_type : null;
    const counts: Record<string, number> = {};
    likes.forEach(like => {
      const type = like.reaction_type || 'like';
      counts[type] = (counts[type] || 0) + 1;
    });
    setPostLikesMap(prev => {
      const next = new Map(prev);
      next.set(postId, {
        liked: Boolean(myReaction),
        likesCount: likes.length,
        reactionType: myReaction ? myReaction as ReactionType : null,
        topReactions: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([type]) => type),
        likerNames: likes.filter(like => like.user_id !== userId).map(like => namesById.get(like.user_id) || '').filter(Boolean),
        currentUserLiked: Boolean(myReaction),
      });
      return next;
    });
  }, [userId]);

  const refreshCommentLikes = useCallback(async (commentId: string) => {
    if (!knownCommentIdsRef.current.has(commentId)) return;
    const { data, error } = await supabase
      .from('comment_likes')
      .select('user_id, reaction_type')
      .eq('comment_id', commentId);
    if (error) return;
    const likes = data || [];
    const counts: Record<string, number> = {};
    likes.forEach(like => { counts[like.reaction_type] = (counts[like.reaction_type] || 0) + 1; });
    const myReaction = userId ? likes.find(like => like.user_id === userId)?.reaction_type : null;
    setCommentLikesMap(prev => {
      const next = new Map(prev);
      next.set(commentId, {
        likesCount: likes.length,
        userReaction: myReaction ? myReaction as ReactionType : null,
        topReactions: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([type]) => type),
        likerNames: prev.get(commentId)?.likerNames || [],
      });
      return next;
    });
  }, [userId]);

  const refreshCommentsForPost = useCallback(async (postId: string) => {
    if (!visiblePostIdsRef.current.has(postId)) return;
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) return;
    const comments = (data || []) as FeedComment[];
    const authorIds = [...new Set(comments.map(comment => comment.user_id))];
    let profileById = new Map<string, ProfileData>();
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: authorIds });
      profileById = new Map(((profiles || []) as ProfileData[]).map(profile => [profile.id, profile]));
    }
    const enriched = comments.map(comment => {
      const profile = profileById.get(comment.user_id);
      return {
        ...comment,
        parent_id: comment.parent_id || null,
        user: profile ? { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url } : undefined,
      };
    });
    const currentIds = new Set(enriched.map(comment => comment.id));
    setCommentsMap(prev => {
      const next = new Map(prev);
      next.set(postId, enriched);
      const visibleIds = new Set<string>();
      next.forEach(list => list.forEach(comment => visibleIds.add(comment.id)));
      knownCommentIdsRef.current = visibleIds;
      return next;
    });
    setCommentLikesMap(prev => {
      const next = new Map(prev);
      prev.forEach((_value, id) => {
        if (!knownCommentIdsRef.current.has(id)) next.delete(id);
      });
      currentIds.forEach(id => {
        if (!next.has(id)) next.set(id, { likesCount: 0, userReaction: null, topReactions: [], likerNames: [] });
      });
      return next;
    });
  }, []);

  const scheduleRealtimeRefresh = useCallback((key: string, refresh: () => void) => {
    const existing = realtimeTimersRef.current.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      realtimeTimersRef.current.delete(key);
      refresh();
    }, 120);
    realtimeTimersRef.current.set(key, timer);
  }, []);

  // ============ REALTIME: one channel, targeted refreshes only ============
  useEffect(() => {
    if (postIds.length === 0) return;
    const ch = supabase
      .channel(`feed_engagement_${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, payload => {
        const postId = (payload.new as FeedComment | undefined)?.post_id || (payload.old as FeedComment | undefined)?.post_id;
        if (postId && visiblePostIdsRef.current.has(postId)) {
          scheduleRealtimeRefresh(`comments:${postId}`, () => { void refreshCommentsForPost(postId); });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_likes' }, payload => {
        const row = (payload.new as { comment_id?: string } | undefined) || (payload.old as { comment_id?: string } | undefined);
        const commentId = row?.comment_id;
        if (commentId && knownCommentIdsRef.current.has(commentId)) {
          scheduleRealtimeRefresh(`comment-likes:${commentId}`, () => { void refreshCommentLikes(commentId); });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, (payload) => {
        const row = (payload.new as { post_id?: string } | undefined) || (payload.old as { post_id?: string } | undefined);
        const postId = row?.post_id;
        if (postId && visiblePostIdsRef.current.has(postId)) {
          scheduleRealtimeRefresh(`post-likes:${postId}`, () => { void refreshPostLikes(postId); });
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      realtimeTimersRef.current.forEach(timer => clearTimeout(timer));
      realtimeTimersRef.current.clear();
    };
  }, [idsKey, refreshCommentLikes, refreshCommentsForPost, refreshPostLikes, scheduleRealtimeRefresh]);

  // ============ ACTIONS ============

  const togglePostReaction = async (postId: string, newReaction: ReactionType) => {
    if (!userId || postLikeLoading.has(postId)) { if (!userId) toast.error("Потрібно авторизуватися"); return; }

    setPostLikeLoading(prev => new Set(prev).add(postId));
    const previous = postLikesMap.get(postId) || { liked: false, likesCount: 0, reactionType: null, topReactions: [], likerNames: [], currentUserLiked: false };
    try {
      const isRemoving = previous.liked && previous.reactionType === newReaction;
      const optimistic = isRemoving
        ? { ...previous, liked: false, currentUserLiked: false, reactionType: null, likesCount: Math.max(0, previous.likesCount - 1) }
        : { ...previous, liked: true, currentUserLiked: true, reactionType: newReaction, likesCount: previous.liked ? previous.likesCount : previous.likesCount + 1 };
      setPostLikesMap(prev => new Map(prev).set(postId, optimistic));

      if (isRemoving) {
        const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
        if (error) throw error;
      } else if (previous.liked) {
        const { error } = await supabase.from('post_likes').update({ reaction_type: newReaction }).eq('post_id', postId).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('post_likes').insert([{ post_id: postId, user_id: userId, reaction_type: newReaction }]);
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error toggling post reaction:", error);
      setPostLikesMap(prev => new Map(prev).set(postId, previous));
      toast.error("Не вдалося зберегти реакцію");
    } finally {
      setPostLikeLoading(prev => { const s = new Set(prev); s.delete(postId); return s; });
    }
  };

  const toggleCommentReaction = async (commentId: string, reactionType: ReactionType) => {
    if (!userId || commentLikeLoading.has(commentId)) return;
    setCommentLikeLoading(prev => new Set(prev).add(commentId));
    const current = commentLikesMap.get(commentId) || { likesCount: 0, userReaction: null, topReactions: [], likerNames: [] };
    try {

      if (current.userReaction === reactionType) {
        // Remove reaction — optimistic
        setCommentLikesMap(prev => {
          const m = new Map(prev);
          m.set(commentId, { ...current, userReaction: null, likesCount: Math.max(0, current.likesCount - 1) });
          return m;
        });
        const { error } = await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId);
        if (error) throw error;
      } else if (current.userReaction) {
        // Change reaction — optimistic
        setCommentLikesMap(prev => {
          const m = new Map(prev);
          m.set(commentId, { ...current, userReaction: reactionType });
          return m;
        });
        const { error } = await supabase.from('comment_likes').update({ reaction_type: reactionType }).eq('comment_id', commentId).eq('user_id', userId);
        if (error) throw error;
      } else {
        // Add reaction — optimistic
        setCommentLikesMap(prev => {
          const m = new Map(prev);
          m.set(commentId, { ...current, userReaction: reactionType, likesCount: current.likesCount + 1 });
          return m;
        });
        const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId, reaction_type: reactionType });
        if (error) throw error;
      }
      // Realtime handles topReactions refresh
    } catch (error) {
      console.error('Error toggling comment reaction:', error);
      setCommentLikesMap(prev => new Map(prev).set(commentId, current));
      toast.error('Не вдалося зберегти реакцію');
    } finally {
      setCommentLikeLoading(prev => { const s = new Set(prev); s.delete(commentId); return s; });
    }
  };

  // ============ COMMENT EDIT / DELETE ============
  const editComment = async (commentId: string, newContent: string) => {
    if (!userId) return;
    try {
      // Optimistic update
      setCommentsMap(prev => {
        const m = new Map(prev);
        m.forEach((comments, pid) => {
          m.set(pid, comments.map(c => c.id === commentId ? { ...c, content: newContent } : c));
        });
        return m;
      });
      const { error } = await supabase.from('comments').update({ content: newContent }).eq('id', commentId).eq('user_id', userId);
      if (error) throw error;
    } catch (error) {
      console.error('Error editing comment:', error);
      toast.error('Помилка редагування коментаря');
      loadAllData();
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!userId) return;
    try {
      // Optimistic update
      setCommentsMap(prev => {
        const m = new Map(prev);
        m.forEach((comments, pid) => {
          m.set(pid, comments.filter(c => c.id !== commentId && c.parent_id !== commentId));
        });
        return m;
      });
      const { error } = await supabase.from('comments').delete().eq('id', commentId).eq('user_id', userId);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Помилка видалення коментаря');
      loadAllData();
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
    return commentLikesMap.get(commentId) || { likesCount: 0, userReaction: null, topReactions: [], likerNames: [] };
  }, [commentLikesMap]);

  const getPostLikes = useCallback((postId: string): PostLikesData => {
    return postLikesMap.get(postId) || { liked: false, likesCount: 0, reactionType: null, topReactions: [], likerNames: [], currentUserLiked: false };
  }, [postLikesMap]);

  const getProfile = useCallback((userId: string): ProfileData | undefined => {
    return profilesMap.get(userId);
  }, [profilesMap]);

  const getPostShare = useCallback((postId: string): PostShareData => {
    return { shared: postSharesMap.get(postId) || false, isLoading: shareLoading.has(postId), sharesCount: shareCountsMap.get(postId) || 0 };
  }, [postSharesMap, shareLoading, shareCountsMap]);

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
    editComment,
    deleteComment,
    postLikeLoading,
    commentLikeLoading,
    reload: loadAllData,
  };
}
