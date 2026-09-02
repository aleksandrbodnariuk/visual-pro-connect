import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, BarChart3, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadToStorage } from '@/lib/storage';
import { CreatePollDialog, type PollDraft } from '@/components/messages/CreatePollDialog';
import type { Group } from '@/hooks/groups/useGroups';

interface Props {
  group: Group;
  currentUser: any;
  canPostAsGroup: boolean;
  onPosted: () => void;
}

export function GroupComposer({ group, currentUser, canPostAsGroup, onPosted }: Props) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [asGroup, setAsGroup] = useState(canPostAsGroup);
  const [busy, setBusy] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { toast.error('Максимальний розмір файлу — 50 МБ'); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async () => {
    if (!content.trim() && !file) return;
    if (content.length > 10000) { toast.error('Допис не може перевищувати 10000 символів'); return; }
    setBusy(true);
    try {
      let mediaUrl: string | null = null;
      if (file) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${currentUser.id}/group-${group.id}-${Date.now()}.${ext}`;
        mediaUrl = await uploadToStorage('posts', path, file, file.type);
      }
      const { error } = await supabase.from('posts').insert([{
        content: content.trim(),
        user_id: currentUser.id,
        media_url: mediaUrl,
        group_id: group.id,
        posted_as_group: canPostAsGroup && asGroup,
      }]);
      if (error) throw error;
      setContent(''); clearFile();
      toast.success('Опубліковано');
      onPosted();
    } catch (e: any) {
      console.error('[Group post]', e);
      toast.error(e?.message || 'Не вдалося опублікувати');
    } finally { setBusy(false); }
  };

  const createPoll = async (draft: PollDraft) => {
    try {
      const { data: poll, error: pollErr } = await supabase.from('polls').insert({
        created_by: currentUser.id,
        question: draft.question,
        allow_multiple: draft.allowMultiple,
        is_anonymous: draft.isAnonymous,
        closes_at: draft.closesAt,
      }).select().single();
      if (pollErr) throw pollErr;

      const { error: optErr } = await supabase.from('poll_options')
        .insert(draft.options.map((text, i) => ({ poll_id: poll.id, text, position: i })));
      if (optErr) throw optErr;

      const { data: post, error: postErr } = await supabase.from('posts').insert([{
        content: draft.question,
        user_id: currentUser.id,
        poll_id: poll.id,
        group_id: group.id,
        posted_as_group: canPostAsGroup && asGroup,
      }]).select().single();
      if (postErr) throw postErr;

      await supabase.from('polls').update({ post_id: post.id }).eq('id', poll.id);
      toast.success('Опитування створено');
      onPosted();
    } catch (e: any) {
      console.error('[Group poll]', e);
      toast.error(e?.message || 'Не вдалося створити опитування');
    }
  };

  return (
    <div className="creative-card p-3 space-y-3">
      <div className="flex gap-2">
        <Avatar className="h-9 w-9 border">
          <AvatarImage src={asGroup ? (group.avatar_url || undefined) : (currentUser?.avatar_url || currentUser?.avatarUrl)} />
          <AvatarFallback>{(asGroup ? group.name : (currentUser?.full_name || 'К'))[0]}</AvatarFallback>
        </Avatar>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Напишіть допис у групі «${group.name}»`}
          rows={2}
          maxLength={10000}
        />
      </div>

      {preview && (
        <div className="relative">
          <img src={preview} alt="Прев'ю" className="max-h-64 rounded-md object-contain w-full bg-muted" />
          <Button size="icon" variant="secondary" className="absolute top-2 right-2 h-7 w-7" onClick={clearFile}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <input ref={fileRef} type="file" accept="image/*,audio/*" className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] || null)} />
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
            <ImageIcon className="h-4 w-4 mr-1" /> Медіа
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPollOpen(true)}>
            <BarChart3 className="h-4 w-4 mr-1" /> Опитування
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {canPostAsGroup && (
            <div className="flex items-center gap-2">
              <Label htmlFor="as-group" className="text-xs cursor-pointer">Від імені групи</Label>
              <Switch id="as-group" checked={asGroup} onCheckedChange={setAsGroup} />
            </div>
          )}
          <Button size="sm" onClick={submit} disabled={busy || (!content.trim() && !file)}>
            {busy ? 'Публікація…' : 'Опублікувати'}
          </Button>
        </div>
      </div>

      <CreatePollDialog open={pollOpen} onOpenChange={setPollOpen} onSubmit={createPoll} />
    </div>
  );
}
