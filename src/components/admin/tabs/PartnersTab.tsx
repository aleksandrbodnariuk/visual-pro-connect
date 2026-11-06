import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PARTNER_CATEGORIES, partnerCategoryLabel, safeUrl, type StudioPartner } from "@/lib/studioPartners";

const db = supabase as any;
const EMPTY: Omit<StudioPartner, "id"> = {
  name: "", category: "venue", description: "", logo_url: "", website_url: "", instagram_url: "",
  phone: "", discount_offer: "", is_active: true, sort_order: 0,
};

export function PartnersTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<StudioPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<(Omit<StudioPartner, "id"> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db.from("studio_partners").select("*").order("sort_order").order("name");
    if (error) toast.error("Не вдалося завантажити партнерів");
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (p: StudioPartner) => {
    const { error } = await db.from("studio_partners").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return toast.error("Не вдалося змінити показ");
    setItems((l) => l.map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x)));
  };

  const remove = async (p: StudioPartner) => {
    if (!confirm(`Видалити партнера «${p.name}»?`)) return;
    const { error } = await db.from("studio_partners").delete().eq("id", p.id);
    if (error) return toast.error("Не вдалося видалити");
    toast.success("Партнера видалено");
    setItems((l) => l.filter((x) => x.id !== p.id));
  };

  const upload = async (file: File) => {
    if (!user || !edit) return;
    if (!file.type.startsWith("image/")) return toast.error("Оберіть зображення");
    if (file.size > 5 * 1024 * 1024) return toast.error("Логотип має бути до 5 МБ");
    const path = `${user.id}/partners/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("posts").upload(path, file);
    if (error) return toast.error("Не вдалося завантажити логотип");
    const { data } = supabase.storage.from("posts").getPublicUrl(path);
    setEdit({ ...edit, logo_url: data.publicUrl });
  };

  const save = async () => {
    if (!edit) return;
    const name = edit.name.trim();
    if (!name) return toast.error("Вкажіть назву партнера");
    for (const [k, l] of [["website_url", "сайт"], ["instagram_url", "Instagram"]] as const) {
      if (edit[k]?.trim() && !safeUrl(edit[k])) return toast.error(`Невірне посилання: ${l}`);
    }
    const payload = {
      name: name.slice(0, 120), category: edit.category,
      description: edit.description?.trim().slice(0, 1000) || null,
      logo_url: edit.logo_url?.trim() || null,
      website_url: safeUrl(edit.website_url), instagram_url: safeUrl(edit.instagram_url),
      phone: edit.phone?.trim().slice(0, 40) || null,
      discount_offer: edit.discount_offer?.trim().slice(0, 200) || null,
      is_active: edit.is_active, sort_order: Number(edit.sort_order) || 0,
    };
    setSaving(true);
    const { error } = edit.id
      ? await db.from("studio_partners").update(payload).eq("id", edit.id)
      : await db.from("studio_partners").insert(payload);
    setSaving(false);
    if (error) return toast.error("Не вдалося зберегти партнера");
    toast.success("Збережено");
    setEdit(null);
    load();
  };

  const f = (k: keyof typeof EMPTY) => ({
    value: (edit?.[k] as string | number | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEdit((s) => s && { ...s, [k]: e.target.value }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Партнери студії</CardTitle>
          <CardDescription>Партнери, яких бачать клієнти у вкладці «Партнери студії» ({items.length})</CardDescription>
        </div>
        <Button className="min-h-11" onClick={() => setEdit({ ...EMPTY })}><Plus className="mr-2 h-4 w-4" />Додати партнера</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-8 text-center text-muted-foreground">Завантаження…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Партнерів ще немає. Натисніть «Додати партнера».</p>
        ) : (
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {p.logo_url && <img src={p.logo_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="flex flex-wrap gap-1 text-xs">
                      <Badge variant="secondary">{partnerCategoryLabel(p.category)}</Badge>
                      {p.discount_offer && <Badge variant="outline">{p.discount_offer}</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={p.is_active} onCheckedChange={() => toggle(p)} />
                    {p.is_active ? "Показано" : "Приховано"}
                  </label>
                  <Button size="icon" variant="ghost" className="h-11 w-11" aria-label="Редагувати" onClick={() => setEdit({ ...p })}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-11 w-11 text-destructive" aria-label="Видалити" onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Редагувати партнера" : "Новий партнер"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div><Label>Назва *</Label><Input maxLength={120} {...f("name")} /></div>
              <div>
                <Label>Категорія</Label>
                <Select value={edit.category} onValueChange={(v) => setEdit({ ...edit, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PARTNER_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Опис послуг</Label><Textarea maxLength={1000} rows={3} {...f("description")} /></div>
              <div>
                <Label>Логотип</Label>
                <div className="flex items-center gap-2">
                  {edit.logo_url && <img src={edit.logo_url} alt="" className="h-12 w-12 rounded-md object-cover" />}
                  <Button asChild variant="outline" className="min-h-11">
                    <label className="cursor-pointer"><Upload className="mr-2 h-4 w-4" />Завантажити
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                    </label>
                  </Button>
                </div>
              </div>
              <div><Label>Сайт</Label><Input placeholder="https://" {...f("website_url")} /></div>
              <div><Label>Instagram</Label><Input placeholder="https://instagram.com/…" {...f("instagram_url")} /></div>
              <div><Label>Телефон</Label><Input maxLength={40} {...f("phone")} /></div>
              <div><Label>Бонус для клієнтів B&C studio</Label><Input maxLength={200} placeholder="Напр. −10% для клієнтів студії" {...f("discount_offer")} /></div>
              <div className="flex items-center gap-4">
                <div className="w-28"><Label>Порядок</Label><Input type="number" {...f("sort_order")} /></div>
                <label className="mt-5 flex items-center gap-2 text-sm"><Switch checked={edit.is_active} onCheckedChange={(v) => setEdit({ ...edit, is_active: v })} />Показувати</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Скасувати</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Збереження…" : "Зберегти"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
