import { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Flag, Image as ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { orgActions, type Organization } from '@/hooks/orgs/useOrganizations';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';
const MAX = 5 * 1024 * 1024;

async function download(url: string, name: string) {
  try {
    const blob = await (await fetch(url)).blob();
    const ext = url.split('?')[0].split('.').pop() || 'png';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${name}.${ext}`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch { window.open(url, '_blank', 'noopener'); }
}

export function PartySymbols({ org, canEdit, onChanged }: { org: Organization; canEdit: boolean; onChanged: () => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const flagRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File, field: 'logo_url' | 'flag_url') => {
    if (!user) return;
    if (file.size > MAX) { toast.error('Файл завеликий — максимум 5 МБ'); return; }
    if (!ACCEPT.split(',').includes(file.type)) { toast.error('Підтримуються PNG, JPG, WebP або SVG'); return; }
    setBusy(field);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `${user.id}/org-symbols/${org.id}-${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('posts').upload(path, file, { contentType: file.type, upsert: false });
    if (error) { toast.error('Не вдалося завантажити файл'); setBusy(null); return; }
    const url = supabase.storage.from('posts').getPublicUrl(path).data.publicUrl;
    if (await orgActions.update(org.id, { [field]: url } as Partial<Organization>)) onChanged();
    setBusy(null);
  };

  const items = [
    { field: 'logo_url' as const, title: 'Логотип', url: org.logo_url, icon: ImageIcon, ref: logoRef, hint: 'Для листівок, бейджів і наліпок', file: 'logotyp' },
    { field: 'flag_url' as const, title: 'Прапор', url: org.flag_url, icon: Flag, ref: flagRef, hint: 'Для наметів, банерів і флагштоків', file: 'prapor' },
  ];

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Офіційна символіка</h3>
        {org.logo_url && org.flag_url && (
          <Button size="sm" variant="outline" onClick={async () => { await download(org.logo_url!, 'logotyp'); await download(org.flag_url!, 'prapor'); }}>
            <Download className="h-4 w-4 mr-1" /> Завантажити комплект
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((it) => (
          <div key={it.field} className="rounded-lg border p-3 space-y-2">
            <div className="aspect-[3/2] rounded-md bg-muted flex items-center justify-center overflow-hidden">
              {it.url ? <img src={it.url} alt={`${it.title} ${org.name}`} className="max-h-full max-w-full object-contain" loading="lazy" />
                : <it.icon className="h-10 w-10 text-muted-foreground" />}
            </div>
            <div>
              <p className="font-medium text-sm">{it.title}</p>
              <p className="text-xs text-muted-foreground">{it.hint}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {it.url && <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => download(it.url!, it.file)}><Download className="h-4 w-4 mr-1" /> Завантажити</Button>}
              {canEdit && (
                <>
                  <input ref={it.ref} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f, it.field); }} />
                  <Button size="sm" className="min-h-[44px]" disabled={busy === it.field} onClick={() => it.ref.current?.click()}>
                    <Upload className="h-4 w-4 mr-1" /> {busy === it.field ? 'Завантаження…' : it.url ? 'Замінити' : 'Додати'}
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">PNG, JPG, WebP або SVG, до 5 МБ. Для друку краще SVG або PNG високої якості.</p>
    </Card>
  );
}
