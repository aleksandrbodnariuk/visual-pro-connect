import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CLIENT_TYPES } from "./clientTypes";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function AddClientDialog({ open, onOpenChange, onSaved }: Props) {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [clientType, setClientType] = useState("wedding");
  const [displayName, setDisplayName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setSearch("");
    setDisplayName("");
    setPartnerName("");
    setCity("");
    setNotes("");
    supabase.rpc("get_users_for_admin").then(({ data }) => setUsers(data || []));
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users.slice(0, 8);
    return users
      .filter((u: any) =>
        (u.full_name || "").toLowerCase().includes(q) || (u.phone_number || "").includes(q)
      )
      .slice(0, 8);
  }, [users, search]);

  const save = async () => {
    if (!selected) {
      toast.error("Оберіть користувача");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("client_profiles").upsert(
        {
          user_id: selected.id,
          client_type: clientType,
          display_name: displayName.trim() || null,
          partner_name: partnerName.trim() || null,
          city: city.trim() || null,
          notes: notes.trim() || null,
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;

      await supabase
        .from("user_roles")
        .upsert({ user_id: selected.id, role: "client" as any }, { onConflict: "user_id,role" });

      toast.success("Клієнта збережено");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error("Не вдалося зберегти клієнта");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новий клієнт</DialogTitle>
          <DialogDescription>Надайте користувачу статус «Клієнт» і вкажіть тип.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Користувач</Label>
            {selected ? (
              <div className="flex items-center gap-3 rounded-md border p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selected.avatar_url || undefined} />
                  <AvatarFallback>{(selected.full_name || "К")[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">{selected.full_name || "Без імені"}</div>
                  <div className="truncate text-xs text-muted-foreground">{selected.phone_number}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Змінити</Button>
              </div>
            ) : (
              <>
                <Input placeholder="Пошук за іменем або телефоном" value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="max-h-52 overflow-y-auto rounded-md border divide-y">
                  {filtered.map((u: any) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelected(u)}
                      className="flex w-full items-center gap-3 p-2 text-left hover:bg-muted"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback>{(u.full_name || "К")[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm">{u.full_name || "Без імені"}</div>
                        <div className="truncate text-xs text-muted-foreground">{u.phone_number}</div>
                      </div>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground">Нічого не знайдено</div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label>Тип клієнта</Label>
            <Select value={clientType} onValueChange={setClientType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLIENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Назва пари / клієнта</Label>
              <Input placeholder="Олег та Марія" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Друга особа</Label>
              <Input placeholder="Марія" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Місто</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Нотатки</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Збереження..." : "Зберегти"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}