import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Save, X, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  PORTFOLIO_AVAILABLE_ICONS,
  getPortfolioIconComponent,
} from "@/lib/portfolioCategories";
import {
  usePortfolioCategories,
  type PortfolioCategoryRow,
} from "@/hooks/usePortfolioCategories";
import { cn } from "@/lib/utils";

const slugify = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яіїєґ0-9]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

export function PortfolioCategoriesTab() {
  const { rows, isLoading, refetch } = usePortfolioCategories(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ label: "", icon: "Folder" });

  const resetForm = () => {
    setForm({ label: "", icon: "Folder" });
    setEditingId(null);
    setIsAdding(false);
  };

  const startAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const startEdit = (cat: PortfolioCategoryRow) => {
    setEditingId(cat.id);
    setIsAdding(false);
    setForm({ label: cat.label, icon: cat.icon });
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast.error("Введіть назву категорії");
      return;
    }

    if (isAdding) {
      const newId = slugify(form.label) || `cat_${Date.now()}`;
      const maxOrder = rows.length > 0 ? Math.max(...rows.map((r) => r.sort_order)) : 0;
      const { error } = await supabase.from("portfolio_categories" as any).insert({
        id: newId,
        label: form.label.trim(),
        icon: form.icon,
        sort_order: maxOrder + 10,
      });
      if (error) {
        toast.error("Помилка при додаванні: " + error.message);
        return;
      }
      toast.success("Категорію додано");
    } else if (editingId) {
      const { error } = await supabase
        .from("portfolio_categories" as any)
        .update({ label: form.label.trim(), icon: form.icon })
        .eq("id", editingId);
      if (error) {
        toast.error("Помилка при оновленні: " + error.message);
        return;
      }
      toast.success("Категорію оновлено");
    }

    resetForm();
    refetch();
  };

  const handleDelete = async (cat: PortfolioCategoryRow) => {
    if (cat.is_system) {
      toast.error("Системні категорії не можна видаляти");
      return;
    }
    if (!confirm(`Видалити категорію «${cat.label}»? Існуючі роботи в ній стануть «Інше».`)) return;
    const { error } = await supabase.from("portfolio_categories" as any).delete().eq("id", cat.id);
    if (error) {
      toast.error("Помилка при видаленні: " + error.message);
      return;
    }
    toast.success("Категорію видалено");
    if (editingId === cat.id) resetForm();
    refetch();
  };

  const handleToggleVisibility = async (cat: PortfolioCategoryRow) => {
    const { error } = await supabase
      .from("portfolio_categories" as any)
      .update({ is_visible: !cat.is_visible })
      .eq("id", cat.id);
    if (error) {
      toast.error("Помилка: " + error.message);
      return;
    }
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const PreviewIcon = getPortfolioIconComponent(form.icon);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Категорії портфоліо</CardTitle>
            <CardDescription>
              Керуйте категоріями подій (Весілля, Випуск, ...). Можна додавати власні.
            </CardDescription>
          </div>
          {!isAdding && !editingId && (
            <Button onClick={startAdd} size="sm">
              <Plus className="mr-2 h-4 w-4" /> Додати
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {(isAdding || editingId) && (
            <div className="mb-6 rounded-lg border bg-muted/50 p-4 space-y-4">
              <h3 className="font-medium">{isAdding ? "Нова категорія" : "Редагування"}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Назва</Label>
                  <Input
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="Наприклад: Корпоратив"
                  />
                </div>
                <div>
                  <Label>Іконка</Label>
                  <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {PORTFOLIO_AVAILABLE_ICONS.map((iconName) => {
                        const Icon = getPortfolioIconComponent(iconName);
                        return (
                          <SelectItem key={iconName} value={iconName}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4" /> {iconName}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Попередній перегляд</Label>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm">
                  <PreviewIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{form.label || "Назва категорії"}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm">
                  <Save className="mr-2 h-4 w-4" /> Зберегти
                </Button>
                <Button onClick={resetForm} size="sm" variant="outline">
                  <X className="mr-2 h-4 w-4" /> Скасувати
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {rows.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Категорій поки немає</p>
            )}
            {rows.map((cat) => {
              const Icon = getPortfolioIconComponent(cat.icon);
              return (
                <div
                  key={cat.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3 transition-colors",
                    cat.is_visible ? "hover:bg-muted/50" : "opacity-60 bg-muted/30",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{cat.label}</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      ID: {cat.id}
                    </span>
                    {cat.is_system && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
                        <Lock className="h-3 w-3" /> системна
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cat.is_visible}
                      onCheckedChange={() => handleToggleVisibility(cat)}
                      aria-label={`Видимість ${cat.label}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(cat)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(cat)}
                      disabled={cat.is_system}
                      title={cat.is_system ? "Системну категорію не можна видалити" : "Видалити"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}