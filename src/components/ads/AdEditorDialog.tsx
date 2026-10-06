import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { uploadToStorage } from '@/lib/storage';
import { CTA_OPTIONS, type FeedAd } from '@/lib/feedAds';
import { SponsoredPostCard } from './SponsoredPostCard';
import { toast } from 'sonner';

const toLocal = (iso: string) => {
  const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export function AdEditorDialog({ open, onOpenChange, ad, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; ad: FeedAd | null; onSaved: () => void }) {
  const { user } = useAuth();
  const [f, setF] = useState({ advertiser_name: '', title: '', description: '', media_url: '', cta_text: 'Детальніше', cta_url: '', start: '', end: '', target_views: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    setF({
      advertiser_name: ad?.advertiser_name || '',
      title: ad?.title || '',
      description: ad?.description || '',
      media_url: ad?.media_url || '',
      cta_text: ad?.cta_text || 'Детальніше',
      cta_url: ad?.cta_url || '',
      start: toLocal(ad?.start_date || now.toISOString()),
      end: toLocal(ad?.end_date || new Date(now.getTime() + 14 * 864e5).toISOString()),
      target_views: ad?.target_views ? String(ad.target_views) : '',
    });
  }, [open, ad]);

  const set = (k: keyof typeof f) => (e: any) => setF((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));

  const upload = async (file?: File) => {
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) return toast.error('Можна завантажити лише зображення');
    if (file.size > 5 * 1024 * 1024) return toast.error('Зображення має бути до 5 МБ');
    setBusy(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const url = await uploadToStorage('posts', `${user.id}/ads/${Date.now()}.${ext}`, file, file.type);
      setF((p) => ({ ...p, media_url: url }));
    } catch { toast.error('Не вдалося завантажити зображення'); }
    finally { setBusy(false); }
  };

  const save = async (submit: boolean) => {
    if (!f.advertiser_name.trim() || !f.title.trim() || !f.cta_url.trim()) return toast.error('Заповніть рекламодавця, заголовок і посилання');
    if (!/^(https?:\/\/|\/)/i.test(f.cta_url.trim())) return toast.error('Посилання має починатися з https:// або /');
    if (new Date(f.end) <= new Date(f.start)) return toast.error('Дата завершення має бути пізніше дати початку');
    setBusy(true);
    const payload: any = {
      advertiser_name: f.advertiser_name.trim(),
      title: f.title.trim(),
      description: f.description.trim(),
      media_url: f.media_url || null,
      cta_text: f.cta_text,
      cta_url: f.cta_url.trim(),
      start_date: new Date(f.start).toISOString(),
      end_date: new Date(f.end).toISOString(),
      target_views: f.target_views ? Math.max(1, parseInt(f.target_views, 10)) : null,
      status: submit ? 'pending_approval' : 'draft',
    };
    const q = ad
      ? (supabase as any).from('feed_ads').update(payload).eq('id', ad.id)
      : (supabase as any).from('feed_ads').insert({ ...payload, author_id: user!.id });
    const { error } = await q;
    setBusy(false);
    if (error) return toast.error('Не вдалося зберегти: ' + error.message);
    toast.success(submit ? 'Надіслано на перевірку адміністратору' : 'Чернетку збережено');
    onSaved(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{ad ? 'Редагування реклами' : 'Нова реклама'}</DialogTitle></DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div><Label>Рекламодавець *</Label><Input maxLength={80} value={f.advertiser_name} onChange={set('advertiser_name')} placeholder="Назва компанії чи бренду" /></div>
            <div><Label>Заголовок *</Label><Input maxLength={120} value={f.title} onChange={set('title')} /></div>
            <div><Label>Текст</Label><Textarea maxLength={2000} rows={4} value={f.description} onChange={set('description')} /></div>
            <div>
              <Label>Зображення</Label>
              <Input type="file" accept="image/*" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
              {f.media_url && <Button variant="link" size="sm" className="px-0" onClick={() => setF((p) => ({ ...p, media_url: '' }))}>Прибрати зображення</Button>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Кнопка</Label>
                <Select value={f.cta_text} onValueChange={set('cta_text')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CTA_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Ліміт показів</Label><Input type="number" min={1} value={f.target_views} onChange={set('target_views')} placeholder="Без ліміту" /></div>
            </div>
            <div><Label>Посилання *</Label><Input value={f.cta_url} onChange={set('cta_url')} placeholder="https://… або /groups/…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Початок показу</Label><Input type="datetime-local" value={f.start} onChange={set('start')} /></div>
              <div><Label>Завершення</Label><Input type="datetime-local" value={f.end} onChange={set('end')} /></div>
            </div>
            {ad?.status === 'active' && <p className="text-xs text-muted-foreground">Після змін реклама знову піде на перевірку адміністратору.</p>}
          </div>
          <div className="space-y-2">
            <Label>Як це виглядатиме в стрічці</Label>
            <SponsoredPostCard preview ad={{ id: 'preview', advertiser_name: f.advertiser_name || 'Рекламодавець', title: f.title || 'Заголовок', description: f.description, media_url: f.media_url || null, cta_text: f.cta_text, cta_url: f.cta_url || '/' }} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={busy} onClick={() => save(false)}>Зберегти чернетку</Button>
          <Button disabled={busy} onClick={() => save(true)}>Надіслати на перевірку</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
