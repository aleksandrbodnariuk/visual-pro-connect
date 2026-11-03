import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: [{ id: 'author-1', full_name: 'Олена', avatar_url: 'a.png' }] })),
    from: vi.fn(() => ({
      select: () => ({ in: async () => ({ data: [{ id: 'g1', name: 'Пісня для привітання', avatar_url: 'g.png', created_by: 'author-1' }] }) }),
    })),
  },
}));

import { mapWallPosts, wallFilter } from './profileWall';

const owner = { id: 'owner-1', name: 'Іван' };

describe('profile wall', () => {
  it('includes group greetings tagged to the owner', () => {
    expect(wallFilter('owner-1')).toContain('target_user_id.eq.owner-1');
    expect(wallFilter('owner-1')).toContain('and(user_id.eq.owner-1,group_id.is.null)');
  });

  it('shows a greeting from the group with the birthday badge for the owner', async () => {
    const [post] = await mapWallPosts([
      { id: 'p1', user_id: 'author-1', group_id: 'g1', posted_as_group: true, target_user_id: 'owner-1', content: 'З днем народження!', created_at: '2026-11-02' },
    ], owner);
    expect(post.author.name).toBe('Пісня для привітання');
    expect(post.groupInfo?.postedAsGroup).toBe(true);
    expect(post.greetingFor).toEqual({ id: 'owner-1', name: 'Іван' });
  });
});
