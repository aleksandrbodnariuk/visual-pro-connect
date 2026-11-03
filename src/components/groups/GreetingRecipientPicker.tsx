import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Cake, X } from 'lucide-react';

export interface GreetingRecipient { id: string; full_name: string | null; avatar_url: string | null }

interface Props {
  value: GreetingRecipient | null;
  onChange: (v: GreetingRecipient | null) => void;
}

/** Lets a greeting-group admin tag the birthday person so the post also appears on their profile. */
export function GreetingRecipientPicker({ value, onChange }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GreetingRecipient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value || q.trim().length < 2) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await (supabase.rpc as any)('search_greeting_recipients', { _q: q.trim() });
      if (!cancelled) {
        setResults(error ? [] : (data || []));
        setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, value]);

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-sm">
        <Cake className="h-4 w-4 text-primary shrink-0" />
        <span className="text-muted-foreground">Привітання для:</span>
        <Avatar className="h-6 w-6">
          <AvatarImage src={value.avatar_url || undefined} />
          <AvatarFallback>{(value.full_name || 'К')[0]}</AvatarFallback>
        </Avatar>
        <span className="font-medium truncate flex-1">{value.full_name || 'Користувач'}</span>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => onChange(null)} aria-label="Прибрати іменинника">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Cake className="h-4 w-4 text-primary shrink-0" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Для кого привітання? Почніть вводити ім'я іменинника"
          className="h-9"
          maxLength={100}
        />
      </div>
      {(loading || results.length > 0 || q.trim().length >= 2) && (
        <div className="max-h-56 overflow-y-auto rounded-md border bg-popover">
          {loading && <div className="p-2 text-xs text-muted-foreground">Пошук…</div>}
          {!loading && results.length === 0 && q.trim().length >= 2 && (
            <div className="p-2 text-xs text-muted-foreground">Нікого не знайдено</div>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm hover:bg-accent min-h-[44px]"
              onClick={() => { onChange(r); setQ(''); }}
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={r.avatar_url || undefined} />
                <AvatarFallback>{(r.full_name || 'К')[0]}</AvatarFallback>
              </Avatar>
              <span className="truncate">{r.full_name || 'Користувач'}</span>
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground pl-6">Необов'язково. Привітання з'явиться також на сторінці іменинника, а він отримає сповіщення.</p>
    </div>
  );
}
