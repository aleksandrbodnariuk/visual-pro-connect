import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Pin, PinOff, Send, Trash2, Paperclip, FileText, X, SmilePlus } from 'lucide-react';
import { EmojiPicker } from '@/components/messages/EmojiPicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const QUICK = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];
import { toast } from 'sonner';

const sb = supabase as any;

export function TeamChat({ orgId, canEdit }: { orgId: string; canEdit: boolean }) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, { full_name?: string; avatar_url?: string }>>({});
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [reacts, setReacts] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await sb.from('team_messages').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100);
    const list = (data || []).reverse();
    setMsgs(list);
    const mids = list.map((m: any) => m.id);
    if (mids.length) { const { data: r } = await sb.from('team_message_reactions').select('*').in('message_id', mids); setReacts(r || []); } else setReacts([]);
    const ids = [...new Set([...list.map((m: any) => m.user_id), user?.id].filter(Boolean))];
    if (ids.length) {
      const { data: p } = await sb.rpc('get_safe_public_profiles_by_ids', { _ids: ids });
      if (p) setNames(Object.fromEntries(p.map((x: any) => [x.id, x])));
    }
  }, [orgId, user?.id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const ch = supabase.channel(`team-chat-${orgId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_messages', filter: `organization_id=eq.${orgId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_message_reactions', filter: `organization_id=eq.${orgId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId, load]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  const send = async () => {
    const c = text.trim(); if (!c && !file) return;
    setBusy(true);
    try {
      let att: any = {};
      if (file) {
        if (file.size > 5 * 1024 * 1024) { toast.error('Файл завеликий (макс. 5 МБ)'); return; }
        const ext = file.name.split('.').pop() || 'bin';
        const path = `attachments/${user!.id}/team-${crypto.randomUUID()}.${ext}`;
        const { error: ue } = await supabase.storage.from('message-attachments').upload(path, file, { contentType: file.type || undefined });
        if (ue) { toast.error('Не вдалося завантажити файл'); return; }
        const url = supabase.storage.from('message-attachments').getPublicUrl(path).data.publicUrl;
        att = { attachment_url: url, attachment_type: file.type.startsWith('image/') ? 'image' : 'file', attachment_name: file.name.slice(0, 200) };
      }
      const { error } = await sb.from('team_messages').insert({ organization_id: orgId, user_id: user!.id, content: c.slice(0, 5000), ...att });
      if (error) { toast.error('Не вдалося надіслати. Можливо, ви ще не учасник команди.'); return; }
      setText(''); setFile(null); if (fileRef.current) fileRef.current.value = '';
    } finally { setBusy(false); }
  };
  const toggleReact = async (mid: string, emoji: string) => {
    const mine = reacts.find((r) => r.message_id === mid && r.user_id === user?.id && r.emoji === emoji);
    if (mine) await sb.from('team_message_reactions').delete().eq('id', mine.id);
    else await sb.from('team_message_reactions').insert({ message_id: mid, organization_id: orgId, user_id: user!.id, emoji });
    load();
  };
  const pinned = msgs.filter((m) => m.is_pinned);

  return (
    <Card className="flex flex-col h-[70vh] min-h-[420px] max-w-4xl overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MessageCircle className="h-5 w-5 text-primary" />
        <div><p className="font-semibold leading-tight">Чат команди</p><p className="text-xs text-muted-foreground">{msgs.length} повідомлень</p></div>
      </div>
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
            <div key={m.id} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={(mine ? names[m.user_id]?.avatar_url : p?.avatar_url) || undefined} />
                <AvatarFallback className="text-xs">{(p?.full_name || 'У').slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className={`group max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {!mine && <p className="text-xs font-semibold mb-0.5">{p?.full_name || 'Учасник'}</p>}
                {m.attachment_url && (m.attachment_type === 'image'
                  ? <a href={m.attachment_url} target="_blank" rel="noreferrer"><img src={m.attachment_url} alt={m.attachment_name || 'Фото'} className="mb-1 max-h-64 rounded-xl object-cover" loading="lazy" /></a>
                  : <a href={m.attachment_url} target="_blank" rel="noreferrer" className="mb-1 flex items-center gap-2 rounded-lg bg-background/30 px-2 py-1.5 underline"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{m.attachment_name || 'Документ'}</span></a>)}
                {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                {(() => { const g: Record<string, any[]> = {}; reacts.filter((r) => r.message_id === m.id).forEach((r) => { (g[r.emoji] ||= []).push(r); }); const e = Object.entries(g); return e.length ? (
                  <div className="mt-1 flex flex-wrap gap-1">{e.map(([em, rs]) => <button key={em} onClick={() => toggleReact(m.id, em)} className={`rounded-full border px-1.5 text-xs ${rs.some((r) => r.user_id === user?.id) ? 'border-current' : 'border-transparent bg-background/30'}`}>{em} {rs.length}</button>)}</div>) : null; })()}
                <div className="flex items-center gap-1 mt-1 text-[10px] opacity-70">
                  {new Date(m.created_at).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' })}
                  <Popover><PopoverTrigger asChild><button className="ml-1" aria-label="Реакція"><SmilePlus className="h-3.5 w-3.5" /></button></PopoverTrigger>
                    <PopoverContent className="w-auto p-1 flex gap-1">{QUICK.map((q) => <button key={q} className="h-9 w-9 text-xl rounded hover:bg-muted" onClick={() => toggleReact(m.id, q)}>{q}</button>)}</PopoverContent></Popover>
                  {canEdit && <button className="ml-1" aria-label="Закріпити" onClick={() => sb.from('team_messages').update({ is_pinned: !m.is_pinned }).eq('id', m.id).then(load)}>{m.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}</button>}
                  {(mine || canEdit) && <button aria-label="Видалити" onClick={() => confirm('Видалити повідомлення?') && sb.from('team_messages').delete().eq('id', m.id).then(load)}><Trash2 className="h-3 w-3" /></button>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {file && <div className="border-t border-border px-3 py-2 flex items-center gap-2 text-sm"><FileText className="h-4 w-4" /><span className="truncate flex-1">{file.name}</span><button aria-label="Прибрати файл" onClick={() => setFile(null)}><X className="h-4 w-4" /></button></div>}
      <div className="border-t border-border p-2 flex items-end gap-1 bg-muted/30">
        <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => fileRef.current?.click()} aria-label="Додати фото або документ"><Paperclip className="h-5 w-5" /></Button>
        <div className="h-11 flex items-center"><EmojiPicker onSelectEmoji={(e) => setText((t) => t + e)} /></div>
        <Textarea rows={1} maxLength={5000} className="min-h-11 h-11 max-h-[40vh] resize-y rounded-2xl" placeholder="Повідомлення команді…" value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <Button className="h-11" disabled={busy} onClick={send} aria-label="Надіслати"><Send className="h-4 w-4" /></Button>
      </div>
    </Card>
  );
}
