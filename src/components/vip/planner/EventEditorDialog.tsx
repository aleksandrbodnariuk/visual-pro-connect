import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { VipEvent, VipEventInput, VipEventType } from "@/hooks/vip/useVipEvents";

const EVENT_TYPES: { value: VipEventType; label: string; color: string }[] = [
  { value: "shoot", label: "Зйомка", color: "amber" },
  { value: "meeting", label: "Зустріч", color: "blue" },
  { value: "deadline", label: "Дедлайн", color: "rose" },
  { value: "trip", label: "Поїздка", color: "emerald" },
  { value: "personal", label: "Особисте", color: "violet" },
  { value: "general", label: "Інше", color: "slate" },
];

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(local: string) {
  if (!local) return null;
  return new Date(local).toISOString();
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialDate?: Date | null;
  event?: VipEvent | null;
  onSave: (data: VipEventInput) => Promise<{ error: any }>;
  onDelete?: (id: string) => Promise<{ error: any }>;
}

export function EventEditorDialog({ open, onOpenChange, initialDate, event, onSave, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<VipEventType>("shoot");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setEventType(event.event_type);
      setStartsAt(toLocalInput(event.starts_at));
      setEndsAt(toLocalInput(event.ends_at));
      setLocation(event.location || "");
    } else {
      const base = initialDate ?? new Date();
      const start = new Date(base);
      start.setHours(12, 0, 0, 0);
      setTitle("");
      setDescription("");
      setEventType("shoot");
      setStartsAt(toLocalInput(start.toISOString()));
      setEndsAt("");
      setLocation("");
    }
  }, [open, event, initialDate]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Введіть назву події");
      return;
    }
    if (!startsAt) {
      toast.error("Вкажіть дату й час початку");
      return;
    }
    setSaving(true);
    const colorByType = EVENT_TYPES.find((t) => t.value === eventType)?.color ?? "amber";
    const { error } = await onSave({
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      starts_at: fromLocalInput(startsAt)!,
      ends_at: endsAt ? fromLocalInput(endsAt) : null,
      location: location.trim() || null,
      color: colorByType,
    });
    setSaving(false);
    if (error) {
      toast.error("Не вдалося зберегти подію");
      return;
    }
    toast.success(event ? "Подію оновлено" : "Подію створено");
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;
    if (!confirm("Видалити подію?")) return;
    const { error } = await onDelete(event.id);
    if (error) {
      toast.error("Не вдалося видалити");
      return;
    }
    toast.success("Подію видалено");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? "Редагувати подію" : "Нова подія"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Назва</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Напр. Весілля Олі та Андрія" />
          </div>
          <div className="space-y-1.5">
            <Label>Тип</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as VipEventType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Початок</Label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Кінець (опц.)</Label>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Локація</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} placeholder="Місто, адреса або посилання" />
          </div>
          <div className="space-y-1.5">
            <Label>Опис</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2 flex-row justify-between">
          {event && onDelete ? (
            <Button type="button" variant="ghost" className="text-destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> Видалити
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Зберегти
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { EVENT_TYPES };