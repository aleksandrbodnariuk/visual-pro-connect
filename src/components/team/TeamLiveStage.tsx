import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Radio, Video, Send, X } from 'lucide-react';
import { embedUrl, isMeetingRoom, presentationPhase } from '@/lib/presentation';

const sb = supabase as any;
interface ChatMsg { id: string; name: string; text: string; at: number }

/** Живий чат ефіру: повідомлення йдуть лише присутнім у кімнаті й не зберігаються. */
function LiveChat({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const chRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const name = (user?.user_metadata?.full_name as string) || user?.email?.split('@')[0] || 'Учасник';

  useEffect(() => {
    const ch = supabase.channel(`team-live-${eventId}`, { config: { broadcast: { self: true } } });
    ch.on('broadcast', { event: 'msg' }, ({ payload }) => setMsgs((m) => [...m.slice(-199), payload as ChatMsg])).subscribe();
    chRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [eventId]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [msgs]);

  const send = () => {
    const t = text.trim().slice(0, 500);
    if (!t || !chRef.current) return;
    chRef.current.send({ type: 'broadcast', event: 'msg', payload: { id: crypto.randomUUID(), name, text: t, at: Date.now() } });
    setText('');
  };
  return (
    <div className="flex flex-col h-72 lg:h-full min-h-0 border rounded-lg">
      <p className="px-3 py-2 border-b text-sm font-medium">Чат ефіру</p>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {msgs.length === 0 && <p className="text-muted-foreground">Привітайтеся або поставте запитання спікеру</p>}
        {msgs.map((m) => <p key={m.id}><span className="font-semibold">{m.name}: </span><span className="break-words">{m.text}</span></p>)}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 p-2 border-t">
        <Input value={text} maxLength={500} placeholder="Повідомлення" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <Button size="icon" className="h-10 w-10 shrink-0" onClick={send} aria-label="Надіслати"><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export function LiveStageView({ event, onClose }: { event: any; onClose?: () => void }) {
  const embed = event.link ? embedUrl(event.link) : null;
  const room = isMeetingRoom(event.link);
  return (
    <Card className="p-3 sm:p-4 space-y-3 border-primary">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="destructive" className="gap-1"><Radio className="h-3 w-3" />Ефір</Badge>
        <p className="font-semibold flex-1 min-w-0 truncate">{event.title}</p>
        {onClose && <Button size="icon" variant="ghost" onClick={onClose} aria-label="Згорнути"><X className="h-4 w-4" /></Button>}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        {embed ? (
          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
            <iframe src={embed} title={event.title} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          </div>
        ) : (
          <div className="aspect-video rounded-lg bg-muted flex flex-col items-center justify-center gap-3 p-4 text-center">
            <Video className="h-10 w-10 text-primary" />
            <p className="text-sm text-muted-foreground">{room ? 'Відеокімната команди: камера, мікрофон і показ екрана. Без обмеження часу.' : 'Ця трансляція відкривається на сайті сервісу.'}</p>
            {event.link && <Button asChild className="h-11"><a href={event.link} target="_blank" rel="noreferrer">{room ? 'Увійти в кімнату' : 'Приєднатися'}</a></Button>}
          </div>
        )}
        <LiveChat eventId={event.id} />
      </div>
    </Card>
  );
}

/** Банер «Зараз ефір» над кабінетом команди. */
export function TeamLiveBanner({ orgId }: { orgId: string }) {
  const [live, setLive] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const since = new Date(Date.now() - 12 * 3600000).toISOString();
      const until = new Date(Date.now() + 15 * 60000).toISOString();
      const { data } = await sb.from('team_events').select('id,title,link,starts_at,duration_minutes').eq('organization_id', orgId).gte('starts_at', since).lte('starts_at', until).order('starts_at').limit(10);
      if (!alive) return;
      const now = Date.now();
      // за 15 хв до початку кімната вже відкрита
      setLive((data || []).filter((e: any) => e.link && presentationPhase(now + 15 * 60000, new Date(e.starts_at).getTime(), (e.duration_minutes || 90) + 15) === 'live'));
    };
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [orgId]);
  if (live.length === 0) return null;
  const current = live.find((e) => e.id === open);
  return (
    <div className="space-y-2 mb-3">
      {current ? <LiveStageView event={current} onClose={() => setOpen(null)} /> : live.map((e) => (
        <Card key={e.id} className="p-3 flex items-center gap-3 flex-wrap border-destructive">
          <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" /></span>
          <p className="flex-1 min-w-0 text-sm"><span className="font-semibold">Зараз ефір: </span>{e.title}</p>
          <Button className="h-10" onClick={() => setOpen(e.id)}>Дивитися</Button>
        </Card>
      ))}
    </div>
  );
}
