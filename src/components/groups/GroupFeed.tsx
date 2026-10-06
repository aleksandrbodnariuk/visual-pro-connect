import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from '@/components/feed/PostCard';
import { useFeedData } from '@/hooks/useFeedData';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Group } from '@/hooks/groups/useGroups';

interface Props {
  group: Group;
  currentUser: any;
  refreshKey: number;
}

const PAGE_SIZE = 10;

export function GroupFeed({ group, currentUser, refreshKey }: Props) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const reqId = useRef(0);

  const fetchPage = useCallback(async (offset: number) => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE);
    if (error) throw error;
    const raw = data || [];
    const more = raw.length > PAGE_SIZE;
    const list = raw.slice(0, PAGE_SIZE);
    const authorIds = [...new Set(list.map((p: any) => p.user_id).filter(Boolean))] as string[];
    let authors: any[] = [];
    if (authorIds.length > 0) {
      const { data: a } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: authorIds });
      authors = a || [];
    }
    return {
      more,
      list: list.map((p: any) => ({ ...p, author: authors.find((a) => a.id === p.user_id) || null })),
    };
  }, [group.id]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const { list, more } = await fetchPage(0);
      if (id !== reqId.current) return;
      setPosts(list);
      setHasMore(more);
    } catch {
      if (id === reqId.current) toast.error('Не вдалося завантажити дописи');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const loadMore = async () => {
    if (loadingMore) return;
    const id = reqId.current;
    setLoadingMore(true);
    try {
      const { list, more } = await fetchPage(posts.length);
      if (id !== reqId.current) return;
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...list.filter((p) => !seen.has(p.id))];
      });
      setHasMore(more);
    } catch {
      toast.error('Не вдалося завантажити ще дописи');
    } finally {
      setLoadingMore(false);
    }
  };

  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const feed = useFeedData(postIds);

  const handleDelete = async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) { toast.error('Не вдалося видалити допис'); return; }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success('Допис видалено');
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Завантаження дописів" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/5" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        ))}
      </div>
    );
  }
  if (posts.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
        У групі ще немає дописів
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const asGroup = !!post.posted_as_group;
        const author = post.author;
        return (
          <PostCard
            key={post.id}
            id={post.id}
            author={{
              id: asGroup ? group.created_by : post.user_id,
              name: asGroup ? group.name : (author?.full_name || 'Користувач'),
              avatarUrl: asGroup ? (group.avatar_url || '') : (author?.avatar_url || ''),
              profession: asGroup ? '' : (author?.title || ''),
            }}
            groupInfo={{ id: group.id, name: group.name, avatarUrl: group.avatar_url || '', postedAsGroup: asGroup }}
            imageUrl={post.media_url || undefined}
            caption={post.content || ''}
            pollId={post.poll_id ?? null}
            videoOrientation={post.video_orientation ?? null}
            likes={post.likes_count || 0}
            comments={post.comments_count || 0}
            timeAgo="щойно"
            currentUser={currentUser}
            onDelete={handleDelete}
            feedComments={feed.getCommentsForPost(post.id)}
            postLikesData={feed.getPostLikes(post.id)}
            getCommentLikes={feed.getCommentLikes}
            onTogglePostReaction={feed.togglePostReaction}
            onToggleCommentReaction={feed.toggleCommentReaction}
            onEditComment={feed.editComment}
            onDeleteComment={feed.deleteComment}
            postShareData={feed.getPostShare(post.id)}
            onToggleShare={feed.toggleShare}
          />
        );
      })}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="min-h-11 px-6">
            {loadingMore ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Завантаження…</> : 'Показати ще'}
          </Button>
        </div>
      )}
    </div>
  );
}
