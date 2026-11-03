import { supabase } from '@/integrations/supabase/client';

export interface WallOwner {
  id: string;
  name: string;
  avatarUrl?: string;
  profession?: string;
  categories?: string[];
}

/** PostgREST filter: the owner's own non-group posts plus group greetings that tag the owner. */
export const wallFilter = (userId: string) =>
  `and(user_id.eq.${userId},group_id.is.null),target_user_id.eq.${userId}`;

/** Maps raw post rows to profile-wall cards, resolving authors and groups for greeting posts. */
export async function mapWallPosts(rows: any[], owner: WallOwner) {
  const foreign = rows.filter((p) => p.group_id || p.user_id !== owner.id);
  const authorIds = [...new Set(foreign.map((p) => p.user_id).filter(Boolean))] as string[];
  const groupIds = [...new Set(foreign.map((p) => p.group_id).filter(Boolean))] as string[];

  const [authorsRes, groupsRes] = await Promise.all([
    authorIds.length
      ? supabase.rpc('get_safe_public_profiles_by_ids', { _ids: authorIds })
      : Promise.resolve({ data: [] as any[] }),
    groupIds.length
      ? supabase.from('groups').select('id, name, avatar_url, created_by').in('id', groupIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const authors = new Map<string, any>(((authorsRes as any).data || []).map((a: any) => [a.id, a]));
  const groups = new Map<string, any>(((groupsRes as any).data || []).map((g: any) => [g.id, g]));

  return rows.map((post: any) => {
    const group = post.group_id ? groups.get(post.group_id) : null;
    const asGroup = !!(group && post.posted_as_group);
    const a = authors.get(post.user_id);
    const isOwn = post.user_id === owner.id && !post.group_id;
    return {
      id: post.id,
      author: isOwn
        ? {
            id: owner.id,
            name: owner.name,
            username: `user_${String(post.user_id).substring(0, 5)}`,
            avatarUrl: owner.avatarUrl,
            profession: owner.profession || '',
            categories: owner.categories || [],
          }
        : {
            id: asGroup ? group.created_by : post.user_id,
            name: asGroup ? group.name : (a?.full_name || 'Користувач'),
            username: '',
            avatarUrl: asGroup ? (group.avatar_url || '') : (a?.avatar_url || ''),
            profession: '',
          },
      groupInfo: group
        ? { id: group.id, name: group.name, avatarUrl: group.avatar_url || '', postedAsGroup: asGroup }
        : null,
      greetingFor: post.target_user_id === owner.id ? { id: owner.id, name: owner.name } : null,
      imageUrl: post.media_url,
      caption: post.content,
      pollId: post.poll_id ?? null,
      videoOrientation: post.video_orientation ?? null,
      likes: post.likes_count,
      comments: post.comments_count,
      timeAgo: new Date(post.created_at).toLocaleDateString(),
    };
  });
}
