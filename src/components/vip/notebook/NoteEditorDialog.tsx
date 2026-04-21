import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { VipNote } from "@/hooks/vip/useVipNotes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: VipNote | null;
  userId: string;
  onSaved: () => void;
}

const COLORS = [
  { id: "default", label: "Стандарт", className: "bg-card border-border" },
  { id: "amber", label: "Бурштин", className: "bg-amber-500/15 border-amber-500/40" },
  { id: "rose", label: "Рожевий", className: "bg-rose-500/15 border-rose-500/40" },
  { id: "emerald", label: "Зелений", className: "bg-emerald-500/15 border-emerald-500/40" },
  { id: "sky", label: "Блакитний", className: "bg-sky-500/15 border-sky-500/40" },
  { id: "violet", label: "Фіолет", className: "bg-violet-500/15 border-violet-500/40" },
];

export function NoteEditorDialog({ open, onOpenChange, note, userId, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("default");
  const [isPinned, setIsPinned] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(note?.title || "");
      setContent(note?.content || "");
      setColor(note?.color || "default");
      setIsPinned(note?.is_pinned || false);
      setTags(note?.tags || []);
      setTagInput("");
    }
  }, [open, note]);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || tags.includes(t) || tags.length >= 10) {
      setTagInput("");
      return;
    }
    setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const save = async () => {
    if (!title.trim() && !content.trim()) {
      toast.error("Додайте заголовок або текст");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: userId,
      title: title.trim().slice(0, 200),
      content: content.slice(0, 20000),
      color,
      is_pinned: isPinned,
      tags,
    };
    const { error } = note
      ? await supabase.from("vip_notes" as any).update(payload).eq("id", note.id)
      : await supabase.from("vip_notes" as any).insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Не вдалося зберегти: " + error.message);
      return;
    }
    toast.success(note ? "Нотатку оновлено" : "Нотатку створено");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{note ? "Редагувати нотатку" : "Нова нотатка"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="note-title">Заголовок</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Заголовок нотатки"
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="note-content">Текст</Label>
            <Textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Запишіть свої думки..."
              rows={10}
              maxLength={20000}
            />
            <p className="text-xs text-muted-foreground mt-1">{content.length} / 20000</p>
          </div>

          <div>
            <Label>Колір картки</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={cn(
                    "px-3 py-2 rounded-lg border-2 text-sm transition-all",
                    c.className,
                    color === c.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "opacity-70"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="note-tags">Теги</Label>
            <div className="flex gap-2">
              <Input
                id="note-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Додайте тег і натисніть Enter"
                maxLength={30}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Додати
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    #{t}
                    <button type="button" onClick={() => removeTag(t)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isPinned ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPinned(!isPinned)}
            >
              <Pin className={cn("h-4 w-4 mr-1", isPinned && "fill-current")} />
              {isPinned ? "Закріплено" : "Закріпити"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Зберегти
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const NOTE_COLORS = COLORS;