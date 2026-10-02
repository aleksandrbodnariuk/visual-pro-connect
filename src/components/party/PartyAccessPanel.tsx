import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { partyActions } from '@/hooks/orgs/useOrganizations';

interface Profile { id: string; full_name: string; avatar_url: string | null }

export function PartyAccessPanel({ orgId }: { orgId: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [grants, setGrants] = useState<any[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setGrants(await partyActions.listAccess(orgId));
  }, [orgId]);

  useEffect(() => {
    load();
    supabase.rpc('get_safe_public_profiles').then(({ data }) => setProfiles((data as any[]) || []));
  }, [load]);

  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const grantedIds = new Set(grants.map((g) => g.user_id));
  const results = query.trim().length < 2 ? [] : profiles
    .filter((p) => !grantedIds.has(p.id) && (p.full_name || '').toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <Card className="p-3 space-y-2">
        <p className="text-sm font-medium flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Надати доступ до розділу «Партія»</p>
        <Input placeholder="Почніть вводити ім’я…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {results.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 py-1">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-8 w-8"><AvatarImage src={p.avatar_url || undefined} /><AvatarFallback>{p.full_name?.[0]}</AvatarFallback></Avatar>
              <span className="truncate text-sm">{p.full_name}</span>
            </div>
            <Button size="sm" onClick={async () => { if (await partyActions.grantAccess(orgId, p.id)) { setQuery(''); load(); } }}>Надати</Button>
          </div>
        ))}
      </Card>

      <Card className="p-3">
        <p className="text-sm font-medium mb-2">Мають доступ ({grants.length})</p>
        {grants.length === 0 && <p className="text-sm text-muted-foreground">Доступ ще нікому не надано</p>}
        {grants.map((g) => {
          const p = byId.get(g.user_id);
          return (
            <div key={g.id} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-8 w-8"><AvatarImage src={p?.avatar_url || undefined} /><AvatarFallback>{p?.full_name?.[0] || '?'}</AvatarFallback></Avatar>
                <span className="truncate text-sm">{p?.full_name || 'Користувач'}</span>
              </div>
              <Button size="icon" variant="ghost" onClick={async () => { if (await partyActions.revokeAccess(g.id)) load(); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
