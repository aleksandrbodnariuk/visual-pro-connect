import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarPlus, Phone, PlayCircle, CheckCircle2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { presentationPhase, embedUrl } from '@/lib/presentation';
import { SlideViewer } from '@/components/team/SlideViewer';

const sb = supabase as any;

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}
const two = (n: number) => String(n).padStart(2, '0');

export default function Presentation() {
  const { eventId } = useParams();
  const [sp] = useSearchParams();
  const ref = sp.get('ref');
  const [data, setData] = useState<any>(undefined);
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);
  const now = useNow();

  useEffect(() => {
    const validRef = ref && /^[0-9a-f-]{36}$/i.test(ref) ? ref : null;
    sb.rpc('get_public_presentation', { _event_id: eventId, _ref: validRef }).then(({ data }: any) => setData(data ?? null));
  }, [eventId, ref]);
  useEffect(() => { if (data?.title) document.title = `${data.title} — презентація`; }, [data]);

  if (data === undefined) return <div className="min-h-screen bg-background p-8 text-center text-muted-foreground">Завантаження…</div>;
  if (!data || data.expired) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="p-8 max-w-md text-center space-y-2">
        <h1 className="text-xl font-bold">{data?.expired ? 'Презентація завершилася' : 'Презентацію не знайдено'}</h1>
        <p className="text-muted-foreground text-sm">Доступ за цим посиланням закрито. Зверніться до людини, яка вас запросила.</p>
      </Card>
    </div>
  );

  const start = new Date(data.starts_at).getTime();
  const phase = presentationPhase(now, start, data.duration_minutes);
  const left = Math.max(0, start - now);
  const inv = data.inviter;
  const phone = inv?.phone ? String(inv.phone).replace(/[^\d+]/g, '') : '';
  const embed = data.link ? embedUrl(data.link) : null;
  const end = new Date(start + data.duration_minutes * 60000);
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(data.title)}&dates=${new Date(start).toISOString().replace(/[-:]|\.\d{3}/g, '')}/${end.toISOString().replace(/[-:]|\.\d{3}/g, '')}&details=${encodeURIComponent(window.location.href)}`;

  const submit = async () => {
    const { error } = await sb.rpc('submit_presentation_lead', { _event_id: eventId, _ref: inv?.id ?? null, _name: form.name, _phone: form.phone, _message: form.message });
    if (error) return toast.error(/[а-яіїєґ]/i.test(error.message) ? error.message : 'Не вдалося надіслати заявку');
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
            {data.org_logo ? <img src={data.org_logo} alt={data.org_name} className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-muted-foreground" />}
          </div>
          <p className="text-sm text-muted-foreground">{data.org_name}</p>
        </div>

        {inv && (
          <Card className="p-4 flex items-center gap-3">
            <Avatar className="h-14 w-14"><AvatarImage src={inv.avatar_url || undefined} /><AvatarFallback>{inv.name?.[0]}</AvatarFallback></Avatar>
            <div><p className="text-sm text-muted-foreground">Вас запросив(ла)</p><p className="font-semibold text-lg">{inv.name}</p></div>
          </Card>
        )}

        <Card className="p-6 space-y-3">
          <h1 className="text-2xl md:text-4xl font-bold">{data.title}</h1>
          <p className="text-muted-foreground">{new Date(start).toLocaleString('uk-UA', { dateStyle: 'full', timeStyle: 'short' })}{data.location ? ` · ${data.location}` : ''}</p>
          {data.description && <p className="whitespace-pre-wrap">{data.description}</p>}
          {Array.isArray(data.slides) && data.slides.length > 0 && <SlideViewer slides={data.slides} title={data.title} />}

          {phase === 'before' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">До початку залишилося</p>
              <p className="text-3xl md:text-5xl font-bold tabular-nums">
                {Math.floor(left / 86400000) > 0 && `${Math.floor(left / 86400000)} д `}
                {two(Math.floor(left / 3600000) % 24)}:{two(Math.floor(left / 60000) % 60)}:{two(Math.floor(left / 1000) % 60)}
              </p>
              <Button asChild variant="outline" className="h-11"><a href={gcal} target="_blank" rel="noreferrer"><CalendarPlus className="h-4 w-4 mr-1" />Додати в календар</a></Button>
            </div>
          )}
          {phase === 'live' && (embed
            ? <div className="aspect-video rounded-lg overflow-hidden bg-muted"><iframe src={embed} title={data.title} className="h-full w-full" allow="autoplay; fullscreen" allowFullScreen /></div>
            : data.link
              ? <Button asChild className="h-12 w-full"><a href={data.link} target="_blank" rel="noreferrer"><PlayCircle className="h-5 w-5 mr-1" />Приєднатися до трансляції</a></Button>
              : <p className="text-primary font-medium">Презентація триває зараз</p>)}
          {phase === 'after' && <p className="text-muted-foreground">Презентація завершилася. Дякуємо, що були з нами!</p>}
        </Card>

        {(phone || inv) && (
          <Card className="p-4 space-y-2">
            <p className="font-medium">Маєте запитання? Зв'яжіться{inv ? ` з ${inv.name}` : ''}</p>
            {phone && (
              <div className="flex flex-wrap gap-2">
                <Button asChild className="h-11"><a href={`tel:${phone}`}><Phone className="h-4 w-4 mr-1" />Подзвонити</a></Button>
                <Button asChild variant="outline" className="h-11"><a href={`viber://chat?number=${encodeURIComponent(phone)}`}>Viber</a></Button>
                <Button asChild variant="outline" className="h-11"><a href={`https://wa.me/${phone.replace('+', '')}`} target="_blank" rel="noreferrer">WhatsApp</a></Button>
              </div>
            )}
          </Card>
        )}

        <Card className="p-4 space-y-2">
          {sent ? (
            <p className="flex items-center gap-2 text-primary font-medium"><CheckCircle2 className="h-5 w-5" />Заявку надіслано. З вами зв'яжуться найближчим часом.</p>
          ) : (
            <>
              <p className="font-medium">Хочу дізнатися більше / приєднатися до команди</p>
              <Input placeholder="Ваше ім'я" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Телефон" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Textarea placeholder="Повідомлення (необов'язково)" maxLength={1000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              <Button className="h-11 w-full" onClick={submit} disabled={form.name.trim().length < 2}>Надіслати заявку</Button>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
