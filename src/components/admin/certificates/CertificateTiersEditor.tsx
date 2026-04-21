import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Settings2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Star,
  GripVertical,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  useCertificateTiers,
  type CertificateTierRow,
} from "@/hooks/certificates/useCertificateTiers";

interface DraftForm {
  id: string;
  label: string;
  price_uah: string;
  description: string;
  perks: string; // newline-separated
  gradient: string;
  sort_order: string;
  is_active: boolean;
  highlight: boolean;
}

const GRADIENT_OPTIONS = [
  { value: "from-slate-500 to-slate-700", label: "Сірий" },
  { value: "from-amber-400 via-yellow-300 to-amber-600", label: "Золотий" },
  { value: "from-purple-500 via-fuchsia-500 to-pink-500", label: "Пурпурний" },
  { value: "from-blue-500 to-cyan-500", label: "Синій" },
  { value: "from-emerald-500 to-teal-600", label: "Зелений" },
  { value: "from-rose-500 to-red-600", label: "Червоний" },
];

const emptyDraft = (): DraftForm => ({
  id: "",
  label: "",
  price_uah: "500",
  description: "",
  perks: "",
  gradient: GRADIENT_OPTIONS[0].value,
  sort_order: "10",
  is_active: true,
  highlight: false,
});

const rowToDraft = (r: CertificateTierRow): DraftForm => ({
  id: r.id,
  label: r.label,
  price_uah: String(r.price_uah),
  description: r.description,
  perks: (Array.isArray(r.perks) ? r.perks : []).join("\n"),
  gradient: r.gradient,
  sort_order: String(r.sort_order),
  is_active: r.is_active,
  highlight: r.highlight,
});

export function CertificateTiersEditor() {
  const { rows, loading, reload } = useCertificateTiers(false);
  const [editing, setEditing] = useState<{ mode: "create" | "edit"; draft: DraftForm } | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => setEditing({ mode: "create", draft: emptyDraft() });
  const openEdit = (r: CertificateTierRow) =>
    setEditing({ mode: "edit", draft: rowToDraft(r) });

  const validate = (d: DraftForm): string | null => {
    if (!d.id.trim()) return "Вкажіть ID (латиницею, без пробілів)";
    if (!/^[a-z0-9_-]+$/i.test(d.id.trim()))
      return "ID може містити лише латинські літери, цифри, _ та -";
    if (!d.label.trim()) return "Вкажіть назву тарифу";
    const price = parseFloat(d.price_uah);
    if (isNaN(price) || price <= 0) return "Ціна має бути додатнім числом";
    return null;
  };

  const save = async () => {
    if (!editing) return;
    const err = validate(editing.draft);
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    const d = editing.draft;
    const payload = {
      id: d.id.trim(),
      label: d.label.trim(),
      price_uah: parseFloat(d.price_uah),
      description: d.description.trim(),
      perks: d.perks
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      gradient: d.gradient,
      sort_order: parseInt(d.sort_order) || 0,
      is_active: d.is_active,
      highlight: d.highlight,
    };

    const { error } =
      editing.mode === "create"
        ? await supabase.from("certificate_tiers" as any).insert(payload)
        : await supabase
            .from("certificate_tiers" as any)
            .update(payload)
            .eq("id", d.id.trim());

    setSaving(false);

    if (error) {
      toast.error(
        error.code === "23505"
          ? "Тариф з таким ID вже існує"
          : "Не вдалося зберегти: " + error.message
      );
      return;
    }
    toast.success(editing.mode === "create" ? "Тариф створено" : "Тариф оновлено");
    setEditing(null);
    reload();
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("certificate_tiers" as any).delete().eq("id", id);
    setDeletingId(null);
    if (error) toast.error("Не вдалося видалити: " + error.message);
    else {
      toast.success("Тариф видалено");
      reload();
    }
  };

  const toggleActive = async (r: CertificateTierRow) => {
    const { error } = await supabase
      .from("certificate_tiers" as any)
      .update({ is_active: !r.is_active })
      .eq("id", r.id);
    if (error) toast.error("Не вдалося оновити");
    else reload();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-amber-500" />
              Редагування тарифів
            </CardTitle>
            <CardDescription>
              Керуйте назвами, цінами та умовами сертифікатів. Зміни зʼявляються одразу.
            </CardDescription>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Новий тариф
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            Немає тарифів. Створіть перший.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className={`rounded-lg border p-3 bg-card transition-opacity ${
                  !r.is_active ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-3 flex-wrap">
                  <GripVertical className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{r.label}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {r.id}
                      </Badge>
                      {r.highlight && (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1">
                          <Star className="h-3 w-3" /> Виділений
                        </Badge>
                      )}
                      {!r.is_active && <Badge variant="secondary">Прихований</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5 truncate">
                      {r.description || "—"}
                    </div>
                    <div className="text-sm font-bold mt-1">
                      {r.price_uah}₴{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        → знижка на цю ж суму
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleActive(r)}
                      title={r.is_active ? "Приховати" : "Показати"}
                    >
                      {r.is_active ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Видалити тариф "${r.label}"?`)) remove(r.id);
                      }}
                      disabled={deletingId === r.id}
                    >
                      {deletingId === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
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
            <DialogTitle>
              {editing?.mode === "create" ? "Новий тариф" : "Редагувати тариф"}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-3">
              <div>
                <Label className="mb-1 block">
                  ID (латиницею, унікальний) <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={editing.draft.id}
                  onChange={(e) =>
                    setEditing({ ...editing, draft: { ...editing.draft, id: e.target.value } })
                  }
                  placeholder="basic / standard / premium"
                  disabled={editing.mode === "edit"}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block">
                    Назва <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={editing.draft.label}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        draft: { ...editing.draft, label: e.target.value },
                      })
                    }
                    placeholder="Базовий"
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">
                    Ціна (₴) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={editing.draft.price_uah}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        draft: { ...editing.draft, price_uah: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1 block">Короткий опис</Label>
                <Input
                  value={editing.draft.description}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, description: e.target.value },
                    })
                  }
                  placeholder="Сертифікат на 500₴ знижки на наші послуги"
                  maxLength={150}
                />
              </div>

              <div>
                <Label className="mb-1 block">Переваги (по одному в рядок)</Label>
                <Textarea
                  rows={5}
                  value={editing.draft.perks}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, perks: e.target.value },
                    })
                  }
                  placeholder={"Знижка 500₴ на послуги наших фахівців\nПублічний бейдж\nБез терміну дії"}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block">Колір (градієнт)</Label>
                  <select
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    value={editing.draft.gradient}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        draft: { ...editing.draft, gradient: e.target.value },
                      })
                    }
                  >
                    {GRADIENT_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block">Порядок (нижче = вище)</Label>
                  <Input
                    type="number"
                    value={editing.draft.sort_order}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        draft: { ...editing.draft, sort_order: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    id="active"
                    checked={editing.draft.is_active}
                    onCheckedChange={(v) =>
                      setEditing({ ...editing, draft: { ...editing.draft, is_active: v } })
                    }
                  />
                  <Label htmlFor="active" className="cursor-pointer">
                    Активний (видно покупцям)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="highlight"
                    checked={editing.draft.highlight}
                    onCheckedChange={(v) =>
                      setEditing({ ...editing, draft: { ...editing.draft, highlight: v } })
                    }
                  />
                  <Label htmlFor="highlight" className="cursor-pointer">
                    Виділити як рекомендований
                  </Label>
                </div>
              </div>

              {/* Live preview */}
              <div className="mt-2 rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-2">Перегляд:</p>
                <div
                  className={`inline-block w-12 h-12 rounded-xl bg-gradient-to-br ${editing.draft.gradient}`}
                />
                <div className="mt-2">
                  <span className="font-bold">{editing.draft.label || "Назва"}</span>
                  <span className="ml-2 text-amber-600 dark:text-amber-400">
                    {editing.draft.price_uah}₴
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Скасувати
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Зберегти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
