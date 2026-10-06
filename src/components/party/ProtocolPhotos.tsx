import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Download, Printer, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { compressForProfile } from '@/lib/documentImage';
import type { ProtocolPhoto } from '@/hooks/orgs/useOrganizations';

const MAX = 25 * 1024 * 1024;
const MAX_PHOTOS = 10;

export function ProtocolPhotos({ photos, onChange, readOnly, campaignId, precinctId }: {
  photos: ProtocolPhoto[]; onChange: (p: ProtocolPhoto[]) => void; readOnly: boolean; campaignId: string; precinctId: string;
}) {
  const { user } = useAuth();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<ProtocolPhoto | null>(null);

  const add = async (files: FileList | null) => {
    if (!files || !user) return;
    const list = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
    setBusy(true);
    const next = [...photos];
    for (const f of list) {
      if (!f.type.startsWith('image/')) { toast.error('Можна додавати лише фото'); continue; }
      if (f.size > MAX) { toast.error(`«${f.name}» завеликий — максимум 25 МБ`); continue; }
      const file = await compressForProfile(f, 'document');
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/protocols/${campaignId}/${precinctId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('posts').upload(path, file, { contentType: file.type });
      if (error) { toast.error('Не вдалося завантажити фото'); continue; }
      next.push({ url: supabase.storage.from('posts').getPublicUrl(path).data.publicUrl, label: `Аркуш ${next.length + 1}` });
    }
    onChange(next);
    setBusy(false);
    if (ref.current) ref.current.value = '';
  };

  return (
    <div className="space-y-2 border-t pt-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Фото протоколу ({photos.length})</p>
        {!readOnly && photos.length < MAX_PHOTOS && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => ref.current?.click()} className="min-h-11">
            <Camera className="h-4 w-4 mr-1" />{busy ? 'Обробка…' : 'Додати фото'}
          </Button>
        )}
        <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      </div>
      {photos.length === 0 && <p className="text-xs text-muted-foreground">Сфотографуйте кожен аркуш при гарному освітленні, без відблисків. Якість зберігається достатньою для читання й друку А4.</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <div key={p.url} className="space-y-1">
            <button type="button" onClick={() => setView(p)} className="block w-full aspect-[3/4] rounded-md overflow-hidden border bg-muted">
              <img src={p.url} alt={p.label} loading="lazy" className="w-full h-full object-cover" />
            </button>
            <div className="flex gap-1">
              <Input value={p.label} disabled={readOnly} className="h-8 text-xs" maxLength={60}
                onChange={(e) => onChange(photos.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              {!readOnly && <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Видалити фото"
                onClick={() => onChange(photos.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          </div>
        ))}
      </div>
      {view && <PhotoViewer photo={view} onClose={() => setView(null)} />}
    </div>
  );
}

function PhotoViewer({ photo, onClose }: { photo: ProtocolPhoto; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const print = () => {
    const w = window.open('', '_blank');
    if (!w) { toast.error('Дозвольте спливаючі вікна для друку'); return; }
    w.document.write(`<html><head><title>${photo.label.replace(/</g, '')}</title><style>@page{size:A4;margin:0}body{margin:0}img{width:100%;height:100vh;object-fit:contain}</style></head><body><img src="${photo.url}" onload="setTimeout(()=>{print();close()},200)"></body></html>`);
    w.document.close();
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-[96vw] h-[90vh] flex flex-col p-3">
        <DialogHeader><DialogTitle className="text-base">{photo.label}</DialogTitle></DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="min-h-11" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label="Зменшити"><ZoomOut className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" className="min-h-11" onClick={() => setZoom((z) => Math.min(5, z + 0.5))} aria-label="Збільшити"><ZoomIn className="h-4 w-4" /></Button>
          <span className="self-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="outline" className="min-h-11 ml-auto" onClick={print}><Printer className="h-4 w-4 mr-1" />Друк А4</Button>
          <Button size="sm" variant="outline" className="min-h-11" asChild><a href={photo.url} download target="_blank" rel="noopener"><Download className="h-4 w-4 mr-1" />Оригінал</a></Button>
        </div>
        <div className="flex-1 overflow-auto rounded-md bg-muted">
          <img src={photo.url} alt={photo.label} style={{ width: `${zoom * 100}%` }} className="max-w-none mx-auto block" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
