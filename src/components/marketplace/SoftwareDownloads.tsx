import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Monitor, Smartphone, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as any;
const MAX = 50 * 1024 * 1024;
type Platform = 'windows' | 'android';
interface Release { id: string; platform: Platform; name: string; version: string; author: string | null; description: string | null; file_path: string; file_name: string; file_size: number; downloads: number; created_at: string }

const PLATFORM: Record<Platform, { label: string; icon: typeof Monitor; accept: string; hint: string }> = {
  windows: { label: 'Windows', icon: Monitor, accept: '.exe,.msi,.zip', hint: 'Запустіть завантажений файл і дотримуйтесь кроків встановлення.' },
  android: { label: 'Android', icon: Smartphone, accept: '.apk', hint: 'Відкрийте APK-файл і дозвольте встановлення з цього джерела, якщо телефон попросить.' },
};
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} МБ`;

export function useSoftwareReleases(enabled: boolean) {
  return useQuery({
    queryKey: ['software_releases'], enabled,
    queryFn: async (): Promise<Release[]> => {
      const { data, error } = await db.from('software_releases').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function SoftwareDownloads() {
  const { isAuthenticated } = useAuth();
  const { data = [], isLoading } = useSoftwareReleases(isAuthenticated);
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (r: Release) => {
    setBusy(r.id);
    const { data: s, error } = await supabase.storage.from('software').createSignedUrl(r.file_path, 600, { download: r.file_name });
    setBusy(null);
    if (error || !s) { toast.error('Не вдалося отримати файл'); return; }
    db.rpc('count_software_download', { _id: r.id }).then(() => {});
    window.location.href = s.signedUrl;
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Наші програми</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {!isAuthenticated ? (
          <p className="text-sm text-muted-foreground">Щоб завантажити програми, <Link to="/auth" className="text-primary underline">увійдіть в акаунт</Link>.</p>
        ) : isLoading ? <div className="h-20 rounded-md bg-muted animate-pulse" />
          : data.length === 0 ? <p className="text-sm text-muted-foreground">Програми ще не додано.</p>
          : (
            <div className="grid sm:grid-cols-2 gap-3">
              {data.map((r) => {
                const P = PLATFORM[r.platform]; const Icon = P.icon;
                return (
                  <div key={r.id} className="rounded-lg border p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{P.label} · версія {r.version} · {mb(r.file_size)}</p>
                        {r.author && <p className="text-xs text-muted-foreground">Розробник: {r.author}</p>}
                      </div>
                    </div>
                    {r.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{r.description}</p>}
                    <p className="text-xs text-muted-foreground">{P.hint}</p>
                    <Button className="min-h-11 mt-auto" disabled={busy === r.id} onClick={() => download(r)}>
                      <Download className="h-4 w-4 mr-1" />{busy === r.id ? 'Підготовка…' : `Завантажити для ${P.label}`}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
      </CardContent>
    </Card>
  );
}

export function SoftwareManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useSoftwareReleases(true);
  const [platform, setPlatform] = useState<Platform>('windows');
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (!user || !file || !name.trim()) { toast.error('Вкажіть назву і оберіть файл'); return; }
    if (file.size > MAX) { toast.error('Файл завеликий — максимум 50 МБ'); return; }
    setBusy(true);
    const safe = file.name.replace(/[^\w.\-]/g, '_');
    const path = `${platform}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from('software').upload(path, file, { contentType: file.type || 'application/octet-stream' });
    if (upErr) { setBusy(false); toast.error('Не вдалося завантажити файл'); return; }
    const { error } = await db.from('software_releases').insert({ platform, name: name.trim(), version: version.trim() || '1.0', author: author.trim() || null, description: description.trim() || null, file_path: path, file_name: file.name, file_size: file.size, created_by: user.id });
    setBusy(false);
    if (error) { await supabase.storage.from('software').remove([path]); toast.error('Не вдалося зберегти програму'); return; }
    toast.success('Програму додано');
    setName(''); setAuthor(''); setDescription(''); setFile(null); if (ref.current) ref.current.value = '';
    qc.invalidateQueries({ queryKey: ['software_releases'] });
  };

  const remove = async (r: Release) => {
    if (!confirm(`Видалити «${r.name}»?`)) return;
    const { error } = await db.from('software_releases').delete().eq('id', r.id);
    if (error) { toast.error('Не вдалося видалити'); return; }
    await supabase.storage.from('software').remove([r.file_path]);
    toast.success('Програму видалено');
    qc.invalidateQueries({ queryKey: ['software_releases'] });
  };

  return (
    <Card>
      <CardHeader><CardTitle>Програми для завантаження</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-2">
          <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="windows">Windows</SelectItem><SelectItem value="android">Android</SelectItem></SelectContent>
          </Select>
          <Input placeholder="Версія" value={version} maxLength={40} onChange={(e) => setVersion(e.target.value)} />
          <Input className="sm:col-span-2" placeholder="Назва програми" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          <Input className="sm:col-span-2" placeholder="Автор / розробник (необов'язково)" value={author} maxLength={120} onChange={(e) => setAuthor(e.target.value)} />
          <Textarea className="sm:col-span-2" placeholder="Опис (необов'язково)" value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
          <Input ref={ref} className="sm:col-span-2" type="file" accept={PLATFORM[platform].accept} onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <Button onClick={save} disabled={busy} className="min-h-11"><Upload className="h-4 w-4 mr-1" />{busy ? 'Завантаження…' : 'Додати програму'}</Button>
        <div className="space-y-2">
          {data.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg border p-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{r.name} <span className="text-xs text-muted-foreground">({PLATFORM[r.platform].label}, {r.version})</span></p>
                <p className="text-xs text-muted-foreground">{mb(r.file_size)} · завантажень: {r.downloads}{r.author ? ` · ${r.author}` : ''}</p>
              </div>
              <Button size="icon" variant="ghost" className="text-destructive" aria-label="Видалити" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
