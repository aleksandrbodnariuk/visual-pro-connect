import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Archive } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Campaign, PartyHq, Precinct, Protocol } from '@/hooks/orgs/useOrganizations';
import { PRIVATE_PREFIX } from './ProtocolPhotos';

const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 80) || 'без_назви';

export function ProtocolsZipButton({ campaign, hqs, precincts, protocols }: { campaign: Campaign; hqs: PartyHq[]; precincts: Precinct[]; protocols: Protocol[] }) {
  const [busy, setBusy] = useState('');
  const run = async () => {
    const items = protocols.flatMap((pr) => (pr.photos || []).filter((p) => p.url.startsWith(PRIVATE_PREFIX)).map((p, i) => ({ pr, p, i })));
    if (!items.length) { toast.info('У протоколах ще немає фото'); return; }
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const prec = new Map(precincts.map((p) => [p.id, p]));
    const hq = new Map(hqs.map((h) => [h.id, h.name]));
    let ok = 0;
    for (let s = 0; s < items.length; s += 50) {
      const part = items.slice(s, s + 50);
      setBusy(`${s}/${items.length}`);
      const { data } = await supabase.storage.from('protocols').createSignedUrls(part.map((x) => x.p.url.slice(PRIVATE_PREFIX.length)), 600);
      await Promise.all(part.map(async (x, k) => {
        const url = data?.[k]?.signedUrl; if (!url) return;
        try {
          const blob = await (await fetch(url)).blob();
          const p = prec.get(x.pr.precinct_id);
          const ext = x.p.url.split('.').pop() || 'jpg';
          const author = (x.p as any).author_name ? `_${safe((x.p as any).author_name)}` : '';
          zip.file(`${safe(hq.get(p?.hq_id || '') || 'Штаб')}/Дільниця_${safe(p?.number || x.pr.precinct_id)}/${String(x.i + 1).padStart(2, '0')}_${safe(x.p.label)}${author}.${ext}`, blob);
          ok++;
        } catch { /* пропускаємо недоступний файл */ }
      }));
    }
    setBusy('архів…');
    const out = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(out); a.download = `${safe(campaign.name)}_фото_протоколів.zip`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setBusy('');
    toast.success(`Архів готовий: ${ok} фото`);
  };
  return <Button size="sm" variant="outline" className="min-h-11" disabled={!!busy} onClick={run}><Archive className="h-4 w-4 mr-1" />{busy ? `Збираю ${busy}` : 'Фото протоколів (ZIP)'}</Button>;
}
