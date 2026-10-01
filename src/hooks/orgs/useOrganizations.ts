import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export type OrgType = 'party' | 'company' | 'ngo' | 'other';
export type HqLevel = 'central' | 'oblast' | 'okrug' | 'city' | 'otg' | 'village';
export type PrecinctRole = 'commission' | 'observer';

export interface Organization {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  type: OrgType;
  website: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PartyHq {
  id: string;
  organization_id: string;
  parent_id: string | null;
  level: HqLevel;
  name: string;
  region: string | null;
  address: string | null;
  phone: string | null;
  notes: string | null;
}

export interface HqMember {
  id: string;
  hq_id: string;
  organization_id: string;
  user_id: string | null;
  full_name: string;
  position: string | null;
  phone: string | null;
  is_agitator: boolean;
  notes: string | null;
}

export interface Precinct {
  id: string;
  organization_id: string;
  hq_id: string;
  number: string;
  name: string | null;
  address: string | null;
  voters_count: number;
  notes: string | null;
}

export interface PrecinctMember {
  id: string;
  precinct_id: string;
  organization_id: string;
  full_name: string;
  role: PrecinctRole;
  position: string | null;
  phone: string | null;
}

export interface StructureTemplate {
  id: string;
  organization_id: string;
  level: HqLevel;
  positions: string[];
}

export const HQ_LEVELS: { value: HqLevel; label: string; plural: string }[] = [
  { value: 'central', label: 'Центральний штаб', plural: 'Центральний штаб' },
  { value: 'oblast', label: 'Обласний штаб', plural: 'Обласні штаби' },
  { value: 'okrug', label: 'Окружний (районний) штаб', plural: 'Окружні (районні) штаби' },
  { value: 'city', label: 'Міська організація', plural: 'Міські організації' },
  { value: 'otg', label: 'Організація ОТГ', plural: 'Організації ОТГ' },
  { value: 'village', label: 'Сільська організація', plural: 'Сільські організації' },
];

export const ORG_TYPES: { value: OrgType; label: string }[] = [
  { value: 'party', label: 'Політична партія' },
  { value: 'company', label: 'Компанія' },
  { value: 'ngo', label: 'Громадська організація' },
  { value: 'other', label: 'Інше' },
];

export const levelLabel = (l: HqLevel) => HQ_LEVELS.find((x) => x.value === l)?.label ?? l;
export const levelPlural = (l: HqLevel) => HQ_LEVELS.find((x) => x.value === l)?.plural ?? l;

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Не вдалося завантажити організації');
    setOrganizations((data as Organization[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { organizations, loading, reload };
}

export function useOrganization(orgId?: string) {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasParty, setHasParty] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [orgRes, adminRes] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', orgId).maybeSingle(),
      user?.id
        ? supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' as any })
        : Promise.resolve({ data: false } as any),
    ]);
    setOrganization((orgRes.data as Organization) || null);
    const admin = adminRes?.data === true;
    setIsAdmin(admin);
    if (admin) {
      setHasParty(true);
    } else if (user?.id) {
      const { data } = await supabase
        .from('party_access')
        .select('id')
        .eq('organization_id', orgId)
        .eq('user_id', user.id)
        .maybeSingle();
      setHasParty(!!data);
    } else {
      setHasParty(false);
    }
    setLoading(false);
  }, [orgId, user?.id]);

  useEffect(() => { reload(); }, [reload]);

  return { organization, isAdmin, hasParty, loading, reload };
}

export const orgActions = {
  async create(input: { name: string; description?: string; type: OrgType; website?: string }) {
    const { data, error } = await supabase
      .from('organizations')
      .insert({
        name: input.name,
        description: input.description || null,
        type: input.type,
        website: input.website || null,
        created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      })
      .select('*')
      .maybeSingle();
    if (error) { toast.error('Не вдалося створити організацію: ' + error.message); return null; }
    toast.success('Організацію створено');
    return data as Organization;
  },

  async update(id: string, patch: Partial<Organization>) {
    const { error } = await supabase.from('organizations').update(patch as any).eq('id', id);
    if (error) { toast.error('Не вдалося зберегти зміни'); return false; }
    toast.success('Збережено');
    return true;
  },

  async remove(id: string) {
    const { error } = await supabase.from('organizations').delete().eq('id', id);
    if (error) { toast.error('Не вдалося видалити організацію'); return false; }
    toast.success('Організацію видалено');
    return true;
  },
};

export const partyActions = {
  async listHqs(orgId: string) {
    const { data } = await supabase
      .from('party_hqs')
      .select('*')
      .eq('organization_id', orgId)
      .order('name');
    return (data as PartyHq[]) || [];
  },

  async saveHq(orgId: string, hq: Partial<PartyHq> & { level: HqLevel; name: string }) {
    const payload = {
      organization_id: orgId,
      level: hq.level,
      name: hq.name,
      region: hq.region || null,
      address: hq.address || null,
      phone: hq.phone || null,
      parent_id: hq.parent_id || null,
      notes: hq.notes || null,
    };
    const res = hq.id
      ? await supabase.from('party_hqs').update(payload).eq('id', hq.id)
      : await supabase.from('party_hqs').insert(payload);
    if (res.error) { toast.error('Не вдалося зберегти штаб: ' + res.error.message); return false; }
    toast.success('Штаб збережено');
    return true;
  },

  async removeHq(id: string) {
    const { error } = await supabase.from('party_hqs').delete().eq('id', id);
    if (error) { toast.error('Не вдалося видалити штаб'); return false; }
    return true;
  },

  async listHqMembers(hqId: string) {
    const { data } = await supabase.from('hq_members').select('*').eq('hq_id', hqId).order('created_at');
    return (data as HqMember[]) || [];
  },

  async saveHqMember(orgId: string, hqId: string, m: Partial<HqMember> & { full_name: string }) {
    const payload = {
      organization_id: orgId,
      hq_id: hqId,
      full_name: m.full_name,
      position: m.position || null,
      phone: m.phone || null,
      is_agitator: !!m.is_agitator,
      notes: m.notes || null,
    };
    const res = m.id
      ? await supabase.from('hq_members').update(payload).eq('id', m.id)
      : await supabase.from('hq_members').insert(payload);
    if (res.error) { toast.error('Не вдалося зберегти людину: ' + res.error.message); return false; }
    return true;
  },

  async removeHqMember(id: string) {
    const { error } = await supabase.from('hq_members').delete().eq('id', id);
    if (error) { toast.error('Не вдалося видалити'); return false; }
    return true;
  },

  async listPrecincts(hqId: string) {
    const { data } = await supabase.from('precincts').select('*').eq('hq_id', hqId).order('number');
    return (data as Precinct[]) || [];
  },

  async savePrecinct(orgId: string, hqId: string, p: Partial<Precinct> & { number: string }) {
    const payload = {
      organization_id: orgId,
      hq_id: hqId,
      number: p.number,
      name: p.name || null,
      address: p.address || null,
      voters_count: p.voters_count ?? 0,
      notes: p.notes || null,
    };
    const res = p.id
      ? await supabase.from('precincts').update(payload).eq('id', p.id)
      : await supabase.from('precincts').insert(payload);
    if (res.error) { toast.error('Не вдалося зберегти дільницю: ' + res.error.message); return false; }
    return true;
  },

  async removePrecinct(id: string) {
    const { error } = await supabase.from('precincts').delete().eq('id', id);
    if (error) { toast.error('Не вдалося видалити дільницю'); return false; }
    return true;
  },

  async listPrecinctMembers(precinctId: string) {
    const { data } = await supabase
      .from('precinct_members')
      .select('*')
      .eq('precinct_id', precinctId)
      .order('created_at');
    return (data as PrecinctMember[]) || [];
  },

  async savePrecinctMember(orgId: string, precinctId: string, m: Partial<PrecinctMember> & { full_name: string }) {
    const payload = {
      organization_id: orgId,
      precinct_id: precinctId,
      full_name: m.full_name,
      role: (m.role || 'observer') as PrecinctRole,
      position: m.position || null,
      phone: m.phone || null,
    };
    const res = m.id
      ? await supabase.from('precinct_members').update(payload).eq('id', m.id)
      : await supabase.from('precinct_members').insert(payload);
    if (res.error) { toast.error('Не вдалося зберегти: ' + res.error.message); return false; }
    return true;
  },

  async removePrecinctMember(id: string) {
    const { error } = await supabase.from('precinct_members').delete().eq('id', id);
    if (error) { toast.error('Не вдалося видалити'); return false; }
    return true;
  },

  async listTemplates(orgId: string) {
    const { data } = await supabase.from('hq_structure_templates').select('*').eq('organization_id', orgId);
    return ((data as any[]) || []).map((t) => ({
      ...t,
      positions: Array.isArray(t.positions) ? (t.positions as string[]) : [],
    })) as StructureTemplate[];
  },

  async saveTemplate(orgId: string, level: HqLevel, positions: string[]) {
    const { error } = await supabase
      .from('hq_structure_templates')
      .upsert({ organization_id: orgId, level, positions: positions as any }, { onConflict: 'organization_id,level' });
    if (error) { toast.error('Не вдалося зберегти структуру: ' + error.message); return false; }
    toast.success('Структуру збережено');
    return true;
  },

  async listAccess(orgId: string) {
    const { data } = await supabase.from('party_access').select('*').eq('organization_id', orgId);
    return (data as any[]) || [];
  },

  async grantAccess(orgId: string, userId: string, note?: string) {
    const { error } = await supabase
      .from('party_access')
      .insert({ organization_id: orgId, user_id: userId, note: note || null, granted_by: (await supabase.auth.getUser()).data.user?.id ?? null });
    if (error) { toast.error('Не вдалося надати доступ: ' + error.message); return false; }
    toast.success('Доступ надано');
    return true;
  },

  async revokeAccess(id: string) {
    const { error } = await supabase.from('party_access').delete().eq('id', id);
    if (error) { toast.error('Не вдалося забрати доступ'); return false; }
    return true;
  },
};
