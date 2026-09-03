import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { compressImageAsFile, validateImageSize, OUTPUT_FORMAT, OUTPUT_EXTENSION } from '@/lib/imageCompression';
import { uploadToStorage, deleteOldFile } from '@/lib/storage';
import { groupActions, type Group } from '@/hooks/groups/useGroups';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  group: Group;
  onSaved: () => void;
}

interface Stats {
  views_total: number;
  views_7d: number;
  views_30d: number;
  unique_viewers: number;
  members_count: number;
  posts_count: number;
}

export function GroupSettingsDialog({ open, onOpenChange, group, onSaved }: Props) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [privacy, setPrivacy] = useState<'public' | 'private'>(group.privacy);
  const [postPolicy, setPostPolicy] = useState<'members' | 'admins'>(group.post_policy);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(group.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(group.name);
    setDescription(group.description || '');
    setPrivacy(group.privacy);
    setPostPolicy(group.post_policy);
    setAvatarUrl(group.avatar_url);
    supabase.rpc('get_group_stats', { _group_id: group.id }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setStats(row as unknown as Stats);
    });
  }, [open, group]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Оберіть зображення'); return; }
    const lower = file.name.toLowerCase();
    if (['image/heic', 'image/heif'].includes(file.type) || lower.endsWith('.heic') || lower.endsWith('.heif')) {
      toast.error('Формат HEIC не підтримується. Використайте JPEG або PNG.');
      return;
    }
    const sizeCheck = validateImageSize(file, 'avatar');
    if (!sizeCheck.valid) { toast.error(sizeCheck.message); return; }
    setUploading(true);
    try {
      const compressed = await compressImageAsFile(file, 'avatar');
      await deleteOldFile('group-avatars', avatarUrl);
      const path = `groups/${group.id}/${Date.now()}${OUTPUT_EXTENSION}`;
      const publicUrl = await uploadToStorage('group-avatars', path, compressed, OUTPUT_FORMAT);
      setAvatarUrl(publicUrl);
      toast.success('Логотип завантажено. Не забудьте зберегти.');
    } catch (err: any) {
      toast.error(err?.message || 'Не вдалося завантажити логотип');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const save = async () => {
    if (name.trim().length < 3) { toast.error('Назва має містити щонайменше 3 символи'); return; }
    setSaving(true);
    const ok = await groupActions.update(group.id, {
      name: name.trim(),
      description: description.trim() || null,
      privacy,
      post_policy: postPolicy,
      avatar_url: avatarUrl,
    });
    setSaving(false);
    if (ok) { onSaved(); onOpenChange(false); }
  };

  const statItems = stats
    ? [
        { label: 'Переглядів усього', value: stats.views_total },
        { label: 'За 7 днів', value: stats.views_7d },
        { label: 'За 30 днів', value: stats.views_30d },
        { label: 'Унікальних відвідувачів', value: stats.unique_viewers },
        { label: 'Учасників', value: stats.members_count },
        { label: 'Дописів', value: stats.posts_count },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Налаштування групи</DialogTitle></DialogHeader>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">Загальні</TabsTrigger>
            <TabsTrigger value="stats">Статистика</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20 border">
                  <AvatarImage src={avatarUrl || undefined} alt={name} />
                  <AvatarFallback><Users className="h-7 w-7 text-muted-foreground" /></AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  title="Змінити логотип"
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </div>
              <p className="text-xs text-muted-foreground">
                {uploading ? 'Завантаження…' : 'Логотип групи. Рекомендовано квадратне зображення.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Назва групи</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>

            <div className="space-y-1.5">
              <Label>Опис</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4} />
            </div>

            <div className="space-y-1.5">
              <Label>Приватність</Label>
              <Select value={privacy} onValueChange={(v) => setPrivacy(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Відкрита — дописи бачать усі</SelectItem>
                  <SelectItem value="private">Закрита — дописи бачать лише учасники</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Хто може публікувати</Label>
              <Select value={postPolicy} onValueChange={(v) => setPostPolicy(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="members">Усі учасники</SelectItem>
                  <SelectItem value="admins">Лише адміністрація групи</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            {!stats ? (
              <p className="text-sm text-muted-foreground">Завантаження статистики…</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {statItems.map((s) => (
                  <div key={s.label} className="rounded-lg border p-3">
                    <div className="text-2xl font-bold">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button onClick={save} disabled={saving || uploading}>{saving ? 'Збереження…' : 'Зберегти'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
