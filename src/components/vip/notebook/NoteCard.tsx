import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pin, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import type { VipNote } from "@/hooks/vip/useVipNotes";
import { NOTE_COLORS } from "./NoteEditorDialog";

interface Props {
  note: VipNote;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

export function NoteCard({ note, onEdit, onDelete, onTogglePin }: Props) {
  const colorClass = NOTE_COLORS.find((c) => c.id === note.color)?.className || "bg-card border-border";

  return (
    <Card className={cn("p-4 flex flex-col gap-3 border-2 hover:shadow-md transition-shadow", colorClass)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {note.title && (
            <h3 className="font-bold text-base line-clamp-2 break-words">{note.title}</h3>
          )}
        </div>
        <button
          type="button"
          onClick={onTogglePin}
          className={cn(
            "p-1 rounded hover:bg-background/60 shrink-0",
            note.is_pinned ? "text-amber-600" : "text-muted-foreground"
          )}
          aria-label={note.is_pinned ? "Відкріпити" : "Закріпити"}
        >
          <Pin className={cn("h-4 w-4", note.is_pinned && "fill-current")} />
        </button>
      </div>

      {note.content && (
        <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-6 break-words">
          {note.content}
        </p>
      )}

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.map((t) => (
            <Badge key={t} variant="outline" className="text-xs">#{t}</Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
        <span className="text-xs text-muted-foreground">
          {format(new Date(note.updated_at), "d MMM yyyy, HH:mm", { locale: uk })}
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit} className="h-7 w-7 p-0">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}