import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Crown, Plus, Pencil, Trash2, Loader2, Star, Eye, EyeOff } from "lucide-react";
import { useVipTiers, type VipTierRow } from "@/hooks/vip/useVipTiers";

const GRADIENT_OPTIONS = [
  { value: "from-slate-300 via-slate-400 to-slate-500", label: "Срібний" },
  { value: "from-yellow-400 via-amber-500 to-orange-500", label: "Золотий" },
  { value: "from-cyan-300 via-purple-400 to-pink-500", label: "Платиновий" },
  { value: "from-emerald-400 to-teal-600", label: "Смарагдовий" },
  { value: "from-rose-500 to-red-600", label: "Рубіновий" },
  { value: "from-indigo-500 to-purple-700", label: "Сапфіровий" },
];

const ANIM_OPTIONS = [
  { value: "shimmer", label: "Shimmer (легкий блиск)" },
  { value: "gold-shimmer", label: "Gold Shimmer (золотий)" },
  { value: "platinum-aurora", label: "Platinum Aurora (полярне сяйво)" },
];

const ICON_OPTIONS = ["Crown", "Star", "Gem"];

interface DraftForm {
  id: string;
  label: string;
  price_uah: string;
  duration_days: string;
  description: string;
  perks: string;
  gradient: string;
  badge_icon: string;
  name_color: string;
  banner_animation: string;
  sort_order: string;
  is_active: boolean;
  highlight: boolean;
  discount_percent: string;
  monthly_bonus_uah: string;
  birthday_bonus_uah: string;
}

const empty = (): DraftForm => ({
  id: "",
  label: "",
  price_uah: "499",
  duration_days: "30",
  description: "",
  perks: "",
  gradient: GRADIENT_OPTIONS[1].value,
  badge_icon: "Crown",
  name_color: "#f59e0b",
  banner_animation: "shimmer",
  sort_order: "10",
  is_active: true,
  highlight: false,
  discount_percent: "10",
  monthly_bonus_uah: "200",
  birthday_bonus_uah: "500",
});

const toDraft = (r: VipTierRow): DraftForm => ({
  id: r.id,
  label: r.label,
  price_uah: String(r.price_uah),
  duration_days: String(r.duration_days),
  description: r.description || "",
  perks: (r.perks || []).join("\n"),
  gradient: r.gradient,
  badge_icon: r.badge_icon,
  name_color: r.name_color || "",
  banner_animation: r.banner_animation,
  sort_order: String(r.sort_order),
  is_active: r.is_active,
  highlight: r.highlight,
  discount_percent: String(r.discount_percent ?? 0),
  monthly_bonus_uah: String(r.monthly_bonus_uah ?? 0),
  birthday_bonus_uah: String(r.birthday_bonus_uah ?? 0),
});

export function VipTiersEditor() {
  const { rows, loading, reload } = useVipTiers(false);
  const [editing, setEditing] = useState<{ mode: "create" | "edit"; draft: DraftForm } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const validate = (d: DraftForm): string | null => {
    if (!d.id.trim()) return "Вкажіть ID";
    if (!/^[a-z0-9_-]+$/i.test(d.id.trim())) return "ID лише латиниця/цифри";
    if (!d.label.trim()) return "Вкажіть назву";
    const price = parseFloat(d.price_uah);
    if (isNaN(price) || price <= 0) return "Ціна має бути > 0";
    const days = parseInt(d.duration_days);
    if (isNaN(days) || days <= 0) return "Тривалість має бути > 0";
    return null;
  };

  const save = async () => {
    if (!editing) return;
    const err = validate(editing.draft);
    if (err) { toast.error(err); return; }
    setSaving(true);
    const d = editing.draft;
    const payload = {
      id: d.id.trim(),
      label: d.label.trim(),
      price_uah: parseFloat(d.price_uah),
      duration_days: parseInt(d.duration_days),
      description: d.description.trim(),
      perks: d.perks.split("\n").map((s) => s.trim()).filter(Boolean),
      gradient: d.gradient,
      badge_icon: d.badge_icon,
      name_color: d.name_color || null,
      banner_animation: d.banner_animation,
      sort_order: parseInt(d.sort_order) || 0,
      is_active: d.is_active,
      highlight: d.highlight,
    };

    const { error } = editing.mode === "create"
      ? await supabase.from("vip_tiers" as any).insert(payload)
      : await supabase.from("vip_tiers" as any).update(payload).eq("id", d.id.trim());

    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "Тариф з таким ID вже існує" : "Не вдалося зберегти: " + error.message);
      return;
    }
    toast.success(editing.mode === "create" ? "Тариф створено" : "Оновлено");
    setEditing(null);
    reload();
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("vip_tiers" as any).delete().eq("id", id);
    setDeletingId(null);
    if (error) toast.error("Не вдалося видалити: " + error.message);
    else { toast.success("Видалено"); reload(); }
  };

  const toggleActive = async (r: VipTierRow) => {
    const { error } = await supabase.from("vip_tiers" as any).update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) toast.error("Помилка");
    else reload();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" /> Тарифи VIP
            </CardTitle>
            <CardDescription>Назви, ціни, тривалість та візуальні налаштування рівнів VIP.</CardDescription>
          </div>
          <Button onClick={() => setEditing({ mode: "create", draft: empty() })} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Новий рівень
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">Немає рівнів</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className={`rounded-lg border p-3 bg-card ${!r.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3 flex-wrap">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${r.gradient} shrink-0`} />
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{r.label}</span>
                      <Badge variant="outline" className="text-[10px]">{r.id}</Badge>
                      {r.highlight && <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1"><Star className="h-3 w-3" /> Виділений</Badge>}
                      {!r.is_active && <Badge variant="secondary">Прихований</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5 truncate">{r.description || "—"}</div>
                    <div className="text-sm font-bold mt-1">{r.price_uah}₴ <span className="text-xs font-normal text-muted-foreground">за {r.duration_days} днів</span></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => toggleActive(r)}>
                      {r.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditing({ mode: "edit", draft: toDraft(r) })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" disabled={deletingId === r.id} onClick={() => { if (confirm(`Видалити "${r.label}"?`)) remove(r.id); }}>
                      {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.mode === "create" ? "Новий VIP-рівень" : "Редагувати VIP-рівень"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label className="mb-1 block">ID <span className="text-destructive">*</span></Label>
                <Input value={editing.draft.id} disabled={editing.mode === "edit"}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, id: e.target.value } })}
                  placeholder="silver / gold / platinum" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block">Назва <span className="text-destructive">*</span></Label>
                  <Input value={editing.draft.label} maxLength={50}
                    onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, label: e.target.value } })} />
                </div>
                <div>
                  <Label className="mb-1 block">Ціна (₴) <span className="text-destructive">*</span></Label>
                  <Input type="number" min="1" value={editing.draft.price_uah}
                    onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, price_uah: e.target.value } })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block">Тривалість (днів) <span className="text-destructive">*</span></Label>
                  <Input type="number" min="1" value={editing.draft.duration_days}
                    onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, duration_days: e.target.value } })} />
                </div>
                <div>
                  <Label className="mb-1 block">Порядок</Label>
                  <Input type="number" value={editing.draft.sort_order}
                    onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, sort_order: e.target.value } })} />
                </div>
              </div>
              <div>
                <Label className="mb-1 block">Опис</Label>
                <Input value={editing.draft.description} maxLength={150}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, description: e.target.value } })} />
              </div>
              <div>
                <Label className="mb-1 block">Переваги (по одній в рядок)</Label>
                <Textarea rows={4} value={editing.draft.perks}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, perks: e.target.value } })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="mb-1 block">Іконка</Label>
                  <select className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    value={editing.draft.badge_icon}
                    onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, badge_icon: e.target.value } })}>
                    {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <Label className="mb-1 block">Градієнт</Label>
                  <select className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    value={editing.draft.gradient}
                    onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, gradient: e.target.value } })}>
                    {GRADIENT_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block">Анімація банера</Label>
                  <select className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    value={editing.draft.banner_animation}
                    onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, banner_animation: e.target.value } })}>
                    {ANIM_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block">Колір імені (HEX)</Label>
                  <Input value={editing.draft.name_color} placeholder="#f59e0b"
                    onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, name_color: e.target.value } })} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Switch id="vip-active" checked={editing.draft.is_active}
                    onCheckedChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, is_active: v } })} />
                  <Label htmlFor="vip-active" className="cursor-pointer">Активний</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="vip-hl" checked={editing.draft.highlight}
                    onCheckedChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, highlight: v } })} />
                  <Label htmlFor="vip-hl" className="cursor-pointer">Виділити</Label>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 relative overflow-hidden h-20">
                <div className={`absolute inset-0 bg-gradient-to-br ${editing.draft.gradient}`} />
                <div className={`absolute inset-0 vip-anim-${editing.draft.banner_animation}`} />
                <div className="relative text-white font-bold text-lg drop-shadow">{editing.draft.label || "Перегляд"}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Скасувати</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Зберегти</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}