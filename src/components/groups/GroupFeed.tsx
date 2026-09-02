import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from '@/components/feed/PostCard';
import { useFeedData } from '@/hooks/useFeedData';
import { toast } from 'sonner';
import type { Group } from '@/hooks/groups/useGroups';

interface Props {
  group: Group;
  currentUser: any;
  refreshKey: number;
}

export function GroupFeed({ group, currentUser, refreshKey }: Props) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false })
      .limit(50);
    const list = data || [];
    const authorIds = [...new Set(list.map((p: any) => p.user_id).filter(Boolean))] as string[];
    let authors: any[] = [];
    if (authorIds.length > 0) {
      const { data: a } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: authorIds });
      authors = a || [];
    }
    setPosts(list.map((p: any) => ({ ...p, author: authors.find((a) => a.id === p.user_id) || null })));
    setLoading(false);
  }, [group.id]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const feed = useFeedData(postIds);

  const handleDelete = async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) { toast.error('Не вдалося видалити допис'); return; }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success('Допис видалено');
  };

  if (loading) return <div className="text-muted-foreground py-6 text-center">Завантаження дописів…</div>;
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
    </div>
  );
}
