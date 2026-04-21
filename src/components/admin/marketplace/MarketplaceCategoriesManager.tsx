import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Save, X, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";
import type { MarketplaceCategory } from "@/hooks/marketplace/types";

const AVAILABLE_ICONS = [
  "Package", "ShoppingBag", "Smartphone", "Laptop", "Car", "Home", "Sofa", "Shirt",
  "Baby", "Gamepad2", "Music", "Camera", "Book", "Bike", "Wrench", "Palette",
  "Briefcase", "Heart", "Gift", "Sparkles", "Coffee", "Utensils", "Dumbbell", "Plane",
];

const getIcon = (name: string) => {
  return (Icons as any)[name] || Icons.Package;
};

const slugify = (s: string) =>
  s.trim().toLowerCase()
    .replace(/[^a-zа-яіїєґ0-9]+/gi, "_")
    .replace(/_+/g, "_").replace(/^_|_$/g, "");

export function MarketplaceCategoriesManager() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ label: "", icon: "Package" });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin_marketplace_categories"],
    queryFn: async (): Promise<MarketplaceCategory[]> => {
      const { data, error } = await (supabase as any)
        .from("marketplace_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as MarketplaceCategory[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin_marketplace_categories"] });
    qc.invalidateQueries({ queryKey: ["marketplace_categories"] });
  };

  const reset = () => {
    setForm({ label: "", icon: "Package" });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast.error("Введіть назву");
      return;
    }
    if (isAdding) {
      const newId = slugify(form.label) || `cat_${Date.now()}`;
      const maxOrder = rows.length > 0 ? Math.max(...rows.map((r) => r.sort_order)) : 0;
      const { error } = await (supabase as any).from("marketplace_categories").insert({
        id: newId,
        label: form.label.trim(),
        icon: form.icon,
        sort_order: maxOrder + 10,
      });
      if (error) {
        toast.error("Помилка: " + error.message);
        return;
      }
      toast.success("Категорію додано");
    } else if (editingId) {
      const { error } = await (supabase as any)
        .from("marketplace_categories")
        .update({ label: form.label.trim(), icon: form.icon })
        .eq("id", editingId);
      if (error) {
        toast.error("Помилка: " + error.message);
        return;
      }
      toast.success("Оновлено");
    }
    reset();
    refresh();
  };

  const handleDelete = async (cat: MarketplaceCategory) => {
    if (!confirm(`Видалити «${cat.label}»? Усі оголошення в цій категорії потребуватимуть зміни категорії.`)) return;
    const { error } = await (supabase as any).from("marketplace_categories").delete().eq("id", cat.id);
    if (error) {
      toast.error("Помилка: " + error.message);
      return;
    }
    toast.success("Видалено");
    if (editingId === cat.id) reset();
    refresh();
  };

  const handleToggle = async (cat: MarketplaceCategory) => {
    const { error } = await (supabase as any)
      .from("marketplace_categories")
      .update({ is_visible: !cat.is_visible })
      .eq("id", cat.id);
    if (error) {
      toast.error("Помилка: " + error.message);
      return;
    }
    refresh();
  };

  const moveCategory = async (cat: MarketplaceCategory, direction: "up" | "down") => {
    const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((c) => c.id === cat.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    await (supabase as any).from("marketplace_categories").update({ sort_order: other.sort_order }).eq("id", cat.id);
    await (supabase as any).from("marketplace_categories").update({ sort_order: cat.sort_order }).eq("id", other.id);
    refresh();
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const PreviewIcon = getIcon(form.icon);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Категорії маркетплейсу</CardTitle>
          <CardDescription>Керуйте розділами оголошень та їх видимістю</CardDescription>
        </div>
        {!isAdding && !editingId && (
          <Button onClick={() => { reset(); setIsAdding(true); }} size="sm">
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
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Наприклад: Електроніка" />
              </div>
              <div>
                <Label>Іконка</Label>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {AVAILABLE_ICONS.map((iconName) => {
                      const Icon = getIcon(iconName);
                      return (
                        <SelectItem key={iconName} value={iconName}>
                          <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {iconName}</span>
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
              <Button onClick={handleSave} size="sm"><Save className="mr-2 h-4 w-4" /> Зберегти</Button>
              <Button onClick={reset} size="sm" variant="outline"><X className="mr-2 h-4 w-4" /> Скасувати</Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {rows.length === 0 && <p className="text-center text-muted-foreground py-8">Категорій поки немає</p>}
          {rows.map((cat, idx) => {
            const Icon = getIcon(cat.icon);
            return (
              <div
                key={cat.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 transition-colors",
                  cat.is_visible ? "hover:bg-muted/50" : "opacity-60 bg-muted/30",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col">
                    <button onClick={() => moveCategory(cat, "up")} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                      <GripVertical className="h-3 w-3 rotate-90" />
                    </button>
                    <button onClick={() => moveCategory(cat, "down")} disabled={idx === rows.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                      <GripVertical className="h-3 w-3 -rotate-90" />
                    </button>
                  </div>
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{cat.label}</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">ID: {cat.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={cat.is_visible} onCheckedChange={() => handleToggle(cat)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingId(cat.id); setIsAdding(false); setForm({ label: cat.label, icon: cat.icon }); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(cat)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}