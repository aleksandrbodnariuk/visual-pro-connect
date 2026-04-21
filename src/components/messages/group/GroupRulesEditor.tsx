import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, FileText } from "lucide-react";
import { MessagesService } from "../MessagesService";

interface Props {
  conversationId: string;
  description?: string;
  canEdit: boolean;
  onChanged: (desc: string) => void;
}

const MAX_LEN = 2000;

export function GroupRulesEditor({ conversationId, description, canEdit, onChanged }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(description || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(description || "");
    setEditing(false);
  }, [description, conversationId]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await MessagesService.updateGroupDescription(conversationId, draft.trim());
    setSaving(false);
    if (ok) {
      onChanged(draft.trim());
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
          placeholder="Опишіть правила групи: тематика, заборонене, очікування від учасників..."
          rows={8}
          className="resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{draft.length}/{MAX_LEN}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(description || ""); }}>
              Скасувати
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              Зберегти
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>Правила групи</span>
        </div>
        {canEdit && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            {description ? "Редагувати" : "Додати"}
          </Button>
        )}
      </div>
      {description ? (
        <div className="rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap break-words">
          {description}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          Правила ще не встановлені
        </div>
      )}
    </div>
  );
}