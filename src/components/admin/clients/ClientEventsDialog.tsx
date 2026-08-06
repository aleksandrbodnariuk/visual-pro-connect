import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { EVENT_TYPES, eventTypeEmoji, eventTypeLabel } from "./clientTypes";
import type { ClientWithUser } from "./useClients";

interface Props {
  client: ClientWithUser | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function ClientEventsDialog({ client, open, onOpenChange, onSaved }: Props) {
  const [eventType, setEventType] = useState("wedding");
  const [eventDate, setEventDate] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [prepDays, setPrepDays] = useState(7);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEventType("wedding");
      setEventDate("");
      setTitle("");
      setNotes("");
      setPrepDays(7);
    }
  }, [open]);

  if (!client) return null;

  const addEvent = async () => {
    if (!eventDate) {
      toast.error("Вкажіть дату події");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("client_events").insert({
      client_user_id: client.user_id,
      event_type: eventType,
      event_date: eventDate,
      title: title.trim() || null,
      notes: notes.trim() || null,
      prep_days: prepDays,
    });
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error("Не вдалося додати дату");
      return;
    }
    toast.success("Дату додано");
    setEventDate("");
    setTitle("");
    setNotes("");
    onSaved();
  };

  const toggleGreeting = async (id: string, value: boolean) => {
    const { error } = await supabase.from("client_events").update({ greeting_enabled: value }).eq("id", id);
    if (error) toast.error("Не вдалося оновити");
    else onSaved();
  };

  const removeEvent = async (id: string) => {
    const { error } = await supabase.from("client_events").delete().eq("id", id);
    if (error) toast.error("Не вдалося видалити");
    else {
      toast.success("Дату видалено");
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Пам'ятні дати — {client.display_name || client.full_name || "Клієнт"}</DialogTitle>
          <DialogDescription>Система щороку автоматично вітає клієнта і завчасно нагадує адміністраторам.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {client.events.length === 0 && (
            <p className="text-sm text-muted-foreground">Дат ще немає.</p>
          )}
          {client.events.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
              <span className="text-xl">{eventTypeEmoji(e.event_type)}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{e.title || eventTypeLabel(e.event_type)}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(e.event_date).toLocaleDateString("uk-UA")} · нагадати за {e.prep_days} дн.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={e.greeting_enabled} onCheckedChange={(v) => toggleGreeting(e.id, v)} />
                <Button variant="ghost" size="icon" onClick={() => removeEvent(e.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-4 rounded-md border p-4">
          <div className="text-sm font-medium">Додати дату</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Тип події</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.emoji} {t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Дата події</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Власна назва (необов'язково)</Label>
              <Input placeholder="річницею весілля" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Нагадати адміну за (днів)</Label>
              <Input
                type="number"
                min={0}
                max={90}
                value={prepDays}
                onChange={(e) => setPrepDays(Math.max(0, Math.min(90, Number(e.target.value) || 0)))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Нотатки для підготовки привітання</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button onClick={addEvent} disabled={saving}>{saving ? "Додавання..." : "Додати дату"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}