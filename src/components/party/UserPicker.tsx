import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface PickProfile { id: string; full_name: string; avatar_url: string | null }

let cache: PickProfile[] | null = null;
export function useProfiles() {
  const [profiles, setProfiles] = useState<PickProfile[]>(cache || []);
  useEffect(() => {
    if (cache) return;
    supabase.rpc('get_safe_public_profiles').then(({ data }) => { cache = (data as any[]) || []; setProfiles(cache); });
  }, []);
  return profiles;
}

export function UserPicker({ onPick, exclude = [], actionLabel = 'Обрати' }: { onPick: (p: PickProfile) => void; exclude?: string[]; actionLabel?: string }) {
  const profiles = useProfiles();
  const [q, setQ] = useState('');
  const res = q.trim().length < 2 ? [] : profiles.filter((p) => !exclude.includes(p.id) && (p.full_name || '').toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <div className="space-y-1">
      <Input placeholder="Почніть вводити ім’я користувача…" value={q} onChange={(e) => setQ(e.target.value)} />
      {res.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-2 py-1">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-8 w-8"><AvatarImage src={p.avatar_url || undefined} /><AvatarFallback>{p.full_name?.[0]}</AvatarFallback></Avatar>
            <span className="truncate text-sm">{p.full_name}</span>
          </div>
          <Button size="sm" onClick={() => { onPick(p); setQ(''); }}>{actionLabel}</Button>
        </div>
      ))}
    </div>
  );
}
