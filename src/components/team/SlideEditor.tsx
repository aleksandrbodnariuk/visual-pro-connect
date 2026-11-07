import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, RefreshCw, Trash2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { extractPptxSlideImages, toWebp } from '@/lib/pptxSlides';

const sb = supabase as any;
const MAX = 80;

/** Редагування слайдів презентації керівником: порядок, заміна, видалення, додавання. Нові слайди стискаються у WebP 1920px. */
export function SlideEditor({ material, orgId, onDone }: { material: any; orgId: string; onDone: () => void }) {
  const { user } = useAuth();
  const [slides, setSlides] = useState<string[]>(material.slides || []);
  const [busy, setBusy] = useState('');

  const uploadBlobs = async (blobs: Blob[]): Promise<string[]> => {
    const stamp = Date.now(); const urls: string[] = [];
    for (let k = 0; k < blobs.length; k++) {
      setBusy(`Стискаю і завантажую ${k + 1} з ${blobs.length}…`);
      const webp = await toWebp(blobs[k]);
      const path = `${user!.id}/team-slides/${orgId}/${stamp}/${String(k + 1).padStart(2, '0')}-${Math.random().toString(36).slice(2, 7)}.webp`;
      const { error } = await supabase.storage.from('posts').upload(path, webp, { contentType: 'image/webp' });
      if (error) throw error;
      urls.push(supabase.storage.from('posts').getPublicUrl(path).data.publicUrl);
    }
    return urls;
  };
  const filesToBlobs = async (files: FileList): Promise<Blob[]> => {
    const list = [...files];
    const pptx = list.find((f) => /\.pptx$/i.test(f.name));
    if (pptx) { setBusy('Читаю слайди…'); return extractPptxSlideImages(pptx); }
    return list.filter((f) => f.type.startsWith('image/')).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  };
  const run = async (fn: () => Promise<void>) => {
    try { await fn(); } catch (e: any) { toast.error(e?.message?.includes('PowerPoint') ? e.message : 'Не вдалося обробити файл'); } finally { setBusy(''); }
  };

  const add = (files: FileList | null) => files?.length && run(async () => {
    const blobs = await filesToBlobs(files);
    if (!blobs.length) return void toast.error('Не знайдено картинок');
    if (slides.length + blobs.length > MAX) return void toast.error(`Максимум ${MAX} слайдів`);
    const urls = await uploadBlobs(blobs);
    setSlides((s) => [...s, ...urls]);
  });
  const replace = (idx: number, files: FileList | null) => files?.[0] && run(async () => {
    const [url] = await uploadBlobs([files[0]]);
    setSlides((s) => s.map((x, i) => (i === idx ? url : x)));
  });
  const move = (idx: number, d: number) => setSlides((s) => {
    const j = idx + d; if (j < 0 || j >= s.length) return s;
    const n = [...s]; [n[idx], n[j]] = [n[j], n[idx]]; return n;
  });
  const save = async () => {
    if (!slides.length) return toast.error('Має залишитися хоча б один слайд');
    const { error } = await sb.from('team_materials').update({ slides }).eq('id', material.id);
    if (error) return toast.error('Не вдалося зберегти. Змінювати слайди може лише керівник команди.');
    toast.success('Слайди збережено'); onDone();
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {slides.map((u, i) => (
          <div key={u + i} className="rounded-md border border-border overflow-hidden bg-card">
            <img src={u} alt={`Слайд ${i + 1}`} loading="lazy" className="w-full aspect-video object-cover bg-muted" />
            <div className="flex items-center justify-between gap-0.5 p-1">
              <span className="text-xs font-semibold w-6 text-center">{i + 1}</span>
              <Button size="icon" variant="ghost" className="h-9 w-9" disabled={i === 0 || !!busy} onClick={() => move(i, -1)} aria-label="Перемістити вліво"><ArrowLeft className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-9 w-9" disabled={i === slides.length - 1 || !!busy} onClick={() => move(i, 1)} aria-label="Перемістити вправо"><ArrowRight className="h-4 w-4" /></Button>
              <label className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted cursor-pointer" aria-label="Замінити слайд" title="Замінити">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { replace(i, e.target.files); e.target.value = ''; }} />
                <RefreshCw className="h-4 w-4" />
              </label>
              <Button size="icon" variant="ghost" className="h-9 w-9" disabled={!!busy} onClick={() => confirm(`Видалити слайд ${i + 1}?`) && setSlides((s) => s.filter((_, k) => k !== i))} aria-label="Видалити слайд"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <label className={`inline-flex h-10 items-center rounded-md border border-input px-3 text-sm cursor-pointer hover:bg-muted ${busy ? 'pointer-events-none opacity-60' : ''}`}>
          <input type="file" multiple accept=".pptx,image/*" className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
          <Plus className="h-4 w-4 mr-1" />Додати слайди (картинки або .pptx)
        </label>
        <Button onClick={save} disabled={!!busy}><Save className="h-4 w-4 mr-1" />Зберегти зміни</Button>
        <Button variant="ghost" onClick={onDone} disabled={!!busy}>Скасувати</Button>
        {busy && <span className="text-sm text-muted-foreground">{busy}</span>}
      </div>
      <p className="text-xs text-muted-foreground">Нові слайди автоматично стискаються до ширини 1920 пікселів у легкий формат, як і основна презентація. Зміни з'являться для всіх після «Зберегти зміни».</p>
    </div>
  );
}
