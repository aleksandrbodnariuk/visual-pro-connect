import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, ChevronLeft, ChevronRight, ImagePlus, Images, Plus, Star, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { toWebp } from '@/lib/pptxSlides';

const sb = supabase as any;
interface Album { id: string; title: string; description: string | null; event_date: string | null; cover_url: string | null; created_at: string; count?: number }
interface Photo { id: string; url: string; caption: string | null; sort_order: number }

/** «Життя команди» — фотоальбоми. Додають лише лідери та керівники (перевіряє RLS). */
export function TeamAlbums({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const [canEdit, setCanEdit] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [open, setOpen] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [view, setView] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', event_date: '' });
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    sb.rpc('is_team_album_editor', { _org_id: orgId, _user_id: user.id }).then(({ data }: any) => setCanEdit(data === true));
  }, [orgId, user?.id]);

  const loadAlbums = useCallback(async () => {
    const { data } = await sb.from('team_albums').select('*, team_photos(count)').eq('organization_id', orgId).order('event_date', { ascending: false, nullsFirst: false });
    setAlbums((data || []).map((a: any) => ({ ...a, count: a.team_photos?.[0]?.count || 0 })));
  }, [orgId]);
  const loadPhotos = useCallback(async (id: string) => {
    const { data } = await sb.from('team_photos').select('id, url, caption, sort_order').eq('album_id', id).order('sort_order').order('created_at');
    setPhotos(data || []);
  }, []);
  useEffect(() => { loadAlbums(); }, [loadAlbums]);
  useEffect(() => { if (open) loadPhotos(open.id); }, [open, loadPhotos]);

  const create = async () => {
    if (!form.title.trim()) return toast.error('Вкажіть назву альбому');
    const { error } = await sb.from('team_albums').insert({ organization_id: orgId, title: form.title.trim().slice(0, 200), description: form.description.slice(0, 2000) || null, event_date: form.event_date || null });
    if (error) return toast.error('Не вдалося створити альбом');
    toast.success('Альбом створено'); setCreating(false); setForm({ title: '', description: '', event_date: '' }); loadAlbums();
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length || !open || !user) return;
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return toast.error('Оберіть фотографії');
    if (list.some((f) => f.size > 50 * 1024 * 1024)) return toast.error('Максимальний розмір фото — 50 МБ');
    let base = photos.length; let ok = 0; let firstUrl: string | null = null;
    try {
      for (let k = 0; k < list.length; k++) {
        setBusy(`Стискаю та завантажую ${k + 1} з ${list.length}…`);
        const webp = await toWebp(list[k]);
        const path = `${user.id}/team-slides/albums/${open.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
        const { error } = await supabase.storage.from('posts').upload(path, webp, { contentType: 'image/webp' });
        if (error) continue;
        const url = supabase.storage.from('posts').getPublicUrl(path).data.publicUrl;
        const { error: e2 } = await sb.from('team_photos').insert({ album_id: open.id, organization_id: orgId, url, sort_order: base++ });
        if (!e2) { ok++; firstUrl ??= url; }
      }
      if (!open.cover_url && firstUrl) {
        await sb.from('team_albums').update({ cover_url: firstUrl }).eq('id', open.id);
        setOpen({ ...open, cover_url: firstUrl });
      }
      ok ? toast.success(`Додано фото: ${ok}`) : toast.error('Не вдалося завантажити фото');
    } finally { setBusy(''); loadPhotos(open.id); loadAlbums(); }
  };

  const removePhoto = async (p: Photo) => {
    if (!confirm('Видалити це фото?')) return;
    const { error } = await sb.from('team_photos').delete().eq('id', p.id);
    if (error) return toast.error('Не вдалося видалити');
    if (open?.cover_url === p.url) { await sb.from('team_albums').update({ cover_url: null }).eq('id', open.id); setOpen({ ...open, cover_url: null }); }
    setView(null); loadPhotos(open!.id); loadAlbums();
  };
  const setCover = async (p: Photo) => {
    const { error } = await sb.from('team_albums').update({ cover_url: p.url }).eq('id', open!.id);
    if (error) return toast.error('Не вдалося змінити обкладинку');
    setOpen({ ...open!, cover_url: p.url }); toast.success('Обкладинку змінено'); loadAlbums();
  };
  const removeAlbum = async () => {
    if (!open || !confirm(`Видалити альбом «${open.title}» разом з усіма фото?`)) return;
    const { error } = await sb.from('team_albums').delete().eq('id', open.id);
    if (error) return toast.error('Не вдалося видалити альбом');
    setOpen(null); loadAlbums();
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  if (open) return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" className="h-11" onClick={() => { setOpen(null); setPhotos([]); }}><ArrowLeft className="h-4 w-4 mr-1" />До всіх альбомів</Button>
        <div className="flex-1" />
        {canEdit && (
          <>
            <Button asChild size="sm" className="h-11" disabled={!!busy}>
              <label className="cursor-pointer"><ImagePlus className="h-4 w-4 mr-1" />Додати фото
                <input type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
              </label>
            </Button>
            <Button size="icon" variant="ghost" className="h-11 w-11" onClick={removeAlbum} aria-label="Видалити альбом"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </>
        )}
      </div>
      <div>
        <h3 className="text-xl font-bold">{open.title}</h3>
        <p className="text-sm text-muted-foreground">{fmtDate(open.event_date)}{open.event_date ? ' · ' : ''}{photos.length} фото</p>
        {open.description && <p className="text-sm mt-1 whitespace-pre-wrap">{open.description}</p>}
      </div>
      {busy && <p className="text-sm text-primary">{busy}</p>}
      {photos.length === 0 ? <Card className="p-6 text-center text-sm text-muted-foreground">У цьому альбомі ще немає фото</Card> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {photos.map((p, i) => (
            <button key={p.id} onClick={() => setView(i)} className="aspect-square overflow-hidden rounded-lg bg-muted">
              <img src={p.url} alt={p.caption || open.title} loading="lazy" className="h-full w-full object-cover transition-transform hover:scale-105" />
            </button>
          ))}
        </div>
      )}
      <Dialog open={view !== null} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-[100vw] sm:max-w-5xl h-[100dvh] sm:h-[90vh] p-0 bg-background border-0 flex flex-col [&>button]:hidden"
          onKeyDown={(e) => { if (e.key === 'ArrowRight') setView((v) => v !== null ? (v + 1) % photos.length : v); if (e.key === 'ArrowLeft') setView((v) => v !== null ? (v - 1 + photos.length) % photos.length : v); }}>
          {view !== null && photos[view] && <Lightbox photos={photos} index={view} setIndex={setView} canEdit={canEdit}
            onClose={() => setView(null)} onDelete={removePhoto} onCover={setCover} />}
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Семінари, відпочинок, визнання — пам’ятні моменти команди.</p>
        {canEdit && <Button className="h-11" onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />Створити альбом</Button>}
      </div>
      {albums.length === 0 ? (
        <Card className="p-8 text-center space-y-2"><Images className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{canEdit ? 'Створіть перший альбом команди' : 'Альбомів поки немає. Додавати їх можуть лідери з рівня 6% (600 групових PV).'}</p></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {albums.map((a) => (
            <button key={a.id} onClick={() => setOpen(a)} className="text-left group">
              <Card className="overflow-hidden">
                <div className="aspect-[4/3] bg-muted overflow-hidden">
                  {a.cover_url ? <img src={a.cover_url} alt={a.title} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    : <div className="h-full flex items-center justify-center"><Images className="h-10 w-10 text-muted-foreground" /></div>}
                </div>
                <div className="p-3">
                  <p className="font-semibold truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(a.event_date)}{a.event_date ? ' · ' : ''}{a.count} фото</p>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новий альбом</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Назва, напр. «Семінар у Києві»" maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} aria-label="Дата події" />
            <Textarea placeholder="Опис (необов’язково)" maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Button className="w-full h-11" onClick={create}>Створити</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Lightbox({ photos, index, setIndex, canEdit, onClose, onDelete, onCover }: {
  photos: Photo[]; index: number; setIndex: (i: number) => void; canEdit: boolean;
  onClose: () => void; onDelete: (p: Photo) => void; onCover: (p: Photo) => void;
}) {
  const p = photos[index];
  const [touchX, setTouchX] = useState<number | null>(null);
  const go = (d: number) => setIndex((index + d + photos.length) % photos.length);
  return (
    <>
      <div className="flex items-center gap-1 p-2">
        <span className="text-sm text-muted-foreground px-2">{index + 1} з {photos.length}</span>
        <div className="flex-1" />
        {canEdit && <Button size="icon" variant="ghost" className="h-11 w-11" onClick={() => onCover(p)} aria-label="Зробити обкладинкою" title="Зробити обкладинкою"><Star className="h-4 w-4" /></Button>}
        {canEdit && <Button size="icon" variant="ghost" className="h-11 w-11" onClick={() => onDelete(p)} aria-label="Видалити фото"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
        <Button size="icon" variant="ghost" className="h-11 w-11" onClick={onClose} aria-label="Закрити"><X className="h-5 w-5" /></Button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center"
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => { if (touchX === null) return; const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); setTouchX(null); }}>
        <img src={p.url} alt={p.caption || ''} className="max-h-full max-w-full object-contain select-none" />
        {photos.length > 1 && <>
          <Button size="icon" variant="secondary" className="absolute left-2 h-11 w-11 rounded-full opacity-80" onClick={() => go(-1)} aria-label="Попереднє"><ChevronLeft className="h-5 w-5" /></Button>
          <Button size="icon" variant="secondary" className="absolute right-2 h-11 w-11 rounded-full opacity-80" onClick={() => go(1)} aria-label="Наступне"><ChevronRight className="h-5 w-5" /></Button>
        </>}
      </div>
      {p.caption && <p className="p-3 text-sm text-center">{p.caption}</p>}
    </>
  );
}
