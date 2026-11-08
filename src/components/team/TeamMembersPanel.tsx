import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { nameMatches } from '@/lib/nameSearch';

const sb = supabase as any;
interface Profile { id: string; full_name: string; avatar_url: string | null }
const ROLES: Record<string, string> = { owner: 'Власник', admin: 'Керівник', leader: 'Лідер команди', member: 'Учасник' };

/** Керування доступом до організації «Команда» — лише для власника/керівника. */
export function TeamMembersPanel({ orgId }: { orgId: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rows, setRows] = useState<{ id: string; user_id: string; role: string }[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const { data } = await sb.from('organization_members').select('id, user_id, role').eq('organization_id', orgId);
    setRows(data || []);
  }, [orgId]);
  useEffect(() => {
    load();
    supabase.rpc('get_safe_public_profiles').then(({ data }) => setProfiles((data as any[]) || []));
  }, [load]);

  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const ids = new Set(rows.map((r) => r.user_id));
  const results = query.trim().length < 2 ? [] : profiles
    .filter((p) => !ids.has(p.id) && nameMatches(query, p.full_name)).slice(0, 8);

  const add = async (userId: string) => {
    const { error } = await sb.from('organization_members').insert({ organization_id: orgId, user_id: userId, role: 'member' });
    if (error) return toast.error('Не вдалося надати доступ');
    toast.success('Доступ надано'); setQuery(''); load();
  };
  const setRole = async (id: string, role: string) => {
    const { error } = await sb.from('organization_members').update({ role }).eq('id', id);
    if (error) return toast.error('Не вдалося змінити роль');
    load();
  };
  const remove = async (id: string) => {
    if (!confirm('Забрати доступ до команди?')) return;
    const { error } = await sb.from('organization_members').delete().eq('id', id);
    if (error) return toast.error('Не вдалося забрати доступ');
    load();
  };

  return (
    <div className="space-y-4">
      <Card className="p-3 space-y-2">
        <p className="text-sm font-medium flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Надати доступ до команди</p>
        <p className="text-xs text-muted-foreground">Організацію бачать лише люди з цього списку. Для решти її не існує.</p>
        <Input placeholder="Почніть вводити ім’я…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {results.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 py-1">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-8 w-8"><AvatarImage src={p.avatar_url || undefined} /><AvatarFallback>{p.full_name?.[0]}</AvatarFallback></Avatar>
              <span className="truncate text-sm">{p.full_name}</span>
            </div>
            <Button size="sm" onClick={() => add(p.id)}>Надати</Button>
          </div>
        ))}
        {query.trim().length >= 2 && results.length === 0 && (
          <p className="text-xs text-muted-foreground">За запитом «{query.trim()}» нікого не знайдено. Перевірте написання або чи людина зареєстрована на платформі.</p>
        )}
      </Card>
      <Card className="p-3">
        <p className="text-sm font-medium mb-2">Мають доступ ({rows.length})</p>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Доступ ще нікому не надано</p>}
        {rows.map((r) => {
          const p = byId.get(r.user_id);
          return (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-8 w-8"><AvatarImage src={p?.avatar_url || undefined} /><AvatarFallback>{p?.full_name?.[0] || '?'}</AvatarFallback></Avatar>
                <span className="truncate text-sm">{p?.full_name || 'Користувач'}</span>
              </div>
              <div className="flex items-center gap-1">
                <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={r.role} onChange={(e) => setRole(r.id, e.target.value)}>
                  {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
