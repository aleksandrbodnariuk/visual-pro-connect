import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface Group {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  privacy: 'public' | 'private';
  post_policy: 'members' | 'admins';
  created_by: string;
  created_at: string;
}

export interface GroupMembership {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'approved' | 'pending';
  created_at: string;
}

export interface GroupMemberWithProfile extends GroupMembership {
  full_name: string;
  avatar_url: string | null;
}

export function slugify(name: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z',
    и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
    р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
    щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ъ: '', ё: 'e',
  };
  const base = name
    .toLowerCase()
    .split('')
    .map((ch) => (map[ch] !== undefined ? map[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${base || 'group'}-${Math.random().toString(36).slice(2, 6)}`;
}

/** All groups + my memberships */
export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberships, setMemberships] = useState<GroupMembership[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: g }, { data: m }] = await Promise.all([
      supabase.from('groups').select('*').order('created_at', { ascending: false }),
      user?.id
        ? supabase.from('group_members').select('*').eq('user_id', user.id)
        : Promise.resolve({ data: [] as any[] } as any),
    ]);
    setGroups((g || []) as Group[]);
    setMemberships((m || []) as GroupMembership[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  return { groups, memberships, loading, reload: load };
}

export function useGroup(groupId?: string) {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([]);
  const [myMembership, setMyMembership] = useState<GroupMembership | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    const { data: g } = await supabase.from('groups').select('*').eq('id', groupId).maybeSingle();
    setGroup((g as Group) || null);

    const { data: ms } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });
    const list = (ms || []) as GroupMembership[];

    let enriched: GroupMemberWithProfile[] = [];
    if (list.length > 0) {
      const { data: profiles } = await supabase.rpc('get_safe_public_profiles_by_ids', {
        _ids: list.map((m) => m.user_id),
      });
      const pMap = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));
      enriched = list.map((m) => ({
        ...m,
        full_name: pMap.get(m.user_id)?.full_name || 'Користувач',
        avatar_url: pMap.get(m.user_id)?.avatar_url || null,
      }));
    }
    setMembers(enriched);
    setMyMembership(user?.id ? list.find((m) => m.user_id === user.id) || null : null);
    setLoading(false);
  }, [groupId, user?.id]);

  useEffect(() => { load(); }, [load]);

  return { group, members, myMembership, loading, reload: load };
}

export const groupActions = {
  async create(payload: {
    name: string;
    description?: string;
    privacy: 'public' | 'private';
    post_policy: 'members' | 'admins';
    avatar_url?: string | null;
    userId: string;
  }): Promise<Group | null> {
    const { data, error } = await supabase
      .from('groups')
      .insert({
        name: payload.name,
        slug: slugify(payload.name),
        description: payload.description || null,
        privacy: payload.privacy,
        post_policy: payload.post_policy,
        avatar_url: payload.avatar_url || null,
        created_by: payload.userId,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message || 'Не вдалося створити групу');
      return null;
    }
    toast.success('Групу створено');
    return data as Group;
  },

  async join(groupId: string, userId: string, privacy: 'public' | 'private') {
    const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userId });
    if (error) { toast.error(error.message || 'Не вдалося приєднатися'); return false; }
    toast.success(privacy === 'private' ? 'Заявку надіслано' : 'Ви приєдналися до групи');
    return true;
  },

  async leave(groupId: string, userId: string) {
    const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
    if (error) { toast.error(error.message || 'Не вдалося вийти'); return false; }
    toast.success('Ви вийшли з групи');
    return true;
  },

  async setStatus(memberId: string, status: 'approved') {
    const { error } = await supabase.from('group_members').update({ status }).eq('id', memberId);
    if (error) { toast.error(error.message || 'Не вдалося оновити'); return false; }
    toast.success('Заявку схвалено');
    return true;
  },

  async setRole(memberId: string, role: 'admin' | 'member') {
    const { error } = await supabase.from('group_members').update({ role }).eq('id', memberId);
    if (error) { toast.error(error.message || 'Не вдалося змінити роль'); return false; }
    toast.success('Роль оновлено');
    return true;
  },

  async removeMember(memberId: string) {
    const { error } = await supabase.from('group_members').delete().eq('id', memberId);
    if (error) { toast.error(error.message || 'Не вдалося видалити'); return false; }
    toast.success('Учасника видалено');
    return true;
  },

  async update(groupId: string, patch: Partial<Group>) {
    const { error } = await supabase.from('groups').update(patch as any).eq('id', groupId);
    if (error) { toast.error(error.message || 'Не вдалося зберегти'); return false; }
    toast.success('Збережено');
    return true;
  },

  async remove(groupId: string) {
    const { error } = await supabase.from('groups').delete().eq('id', groupId);
    if (error) { toast.error(error.message || 'Не вдалося видалити групу'); return false; }
    toast.success('Групу видалено');
    return true;
  },
};

/** Ids of groups the current user belongs to (approved) — used by the news feed. */
export function useMyGroupIds() {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[] | null>(null);

  useEffect(() => {
    let active = true;
    if (!user?.id) { setIds([]); return; }
    supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .then(({ data }) => {
        if (active) setIds((data || []).map((r: any) => r.group_id));
      });
    return () => { active = false; };
  }, [user?.id]);

  return ids;
}
