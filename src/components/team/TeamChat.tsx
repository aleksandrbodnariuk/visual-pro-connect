import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pin, PinOff, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const sb = supabase as any;

export function TeamChat({ orgId, canEdit }: { orgId: string; canEdit: boolean }) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, { full_name?: string; avatar_url?: string }>>({});
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await sb.from('team_messages').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100);
    const list = (data || []).reverse();
    setMsgs(list);
    const ids = [...new Set(list.map((m: any) => m.user_id))];
    if (ids.length) {
      const { data: p } = await sb.rpc('get_safe_public_profiles_by_ids', { _ids: ids });
      if (p) setNames(Object.fromEntries(p.map((x: any) => [x.id, x])));
    }
  }, [orgId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const ch = supabase.channel(`team-chat-${orgId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_messages', filter: `organization_id=eq.${orgId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId, load]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  const send = async () => {
    const c = text.trim(); if (!c) return;
    const { error } = await sb.from('team_messages').insert({ organization_id: orgId, user_id: user!.id, content: c.slice(0, 5000) });
    if (error) return toast.error('Не вдалося надіслати. Можливо, ви ще не учасник команди.');
    setText('');
  };
  const pinned = msgs.filter((m) => m.is_pinned);

  return (
    <Card className="flex flex-col h-[65vh] min-h-[380px]">
      {pinned.length > 0 && (
        <div className="border-b border-border p-2 space-y-1 bg-muted/40">
          {pinned.map((m) => <p key={m.id} className="text-sm flex gap-1"><Pin className="h-4 w-4 text-primary shrink-0" /><span className="line-clamp-2">{m.content}</span></p>)}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {msgs.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Повідомлень ще немає. Напишіть першим!</p>}
        {msgs.map((m) => {
          const mine = m.user_id === user?.id; const p = names[m.user_id];
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`group max-w-[85%] rounded-lg px-3 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {!mine && <p className="text-xs font-semibold mb-0.5">{p?.full_name || 'Учасник'}</p>}
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] opacity-70">
                  {new Date(m.created_at).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' })}
                  {canEdit && <button className="ml-1" aria-label="Закріпити" onClick={() => sb.from('team_messages').update({ is_pinned: !m.is_pinned }).eq('id', m.id).then(load)}>{m.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}</button>}
                  {(mine || canEdit) && <button aria-label="Видалити" onClick={() => confirm('Видалити повідомлення?') && sb.from('team_messages').delete().eq('id', m.id).then(load)}><Trash2 className="h-3 w-3" /></button>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      <div className="border-t border-border p-2 flex gap-2">
        <Textarea rows={1} maxLength={5000} className="min-h-11 resize-none" placeholder="Повідомлення команді…" value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <Button className="h-11" onClick={send} aria-label="Надіслати"><Send className="h-4 w-4" /></Button>
      </div>
    </Card>
  );
}
