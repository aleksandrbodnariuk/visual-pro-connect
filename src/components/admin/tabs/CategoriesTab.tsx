
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, GripVertical, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDynamicCategories, getIconComponent, AVAILABLE_ICONS, AVAILABLE_COLORS, type CategoryItem } from "@/hooks/useDynamicCategories";
import { cn } from "@/lib/utils";

export function CategoriesTab() {
  const { categories, isLoading, refetch } = useDynamicCategories(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", icon: "Camera", color: AVAILABLE_COLORS[0] });

  const resetForm = () => {
    setForm({ id: "", name: "", icon: "Camera", color: AVAILABLE_COLORS[0] });
    setEditingId(null);
    setIsAdding(false);
  };

  const startEdit = (cat: CategoryItem) => {
    setEditingId(cat.id);
    setForm({ id: cat.id, name: cat.name, icon: cat.icon, color: cat.color });
    setIsAdding(false);
  };

  const startAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Введіть назву категорії");
      return;
    }

    if (isAdding) {
      const newId = form.name.trim().toLowerCase().replace(/[^a-zа-яіїєґ0-9]/gi, '_').replace(/_+/g, '_');
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0;

      const { error } = await supabase.from('categories').insert({
        id: newId,
        name: form.name.trim(),
        icon: form.icon,
        color: form.color,
        sort_order: maxOrder + 1,
      });

      if (error) {
        toast.error("Помилка при додаванні: " + error.message);
        return;
      }
      toast.success("Категорію додано");
    } else if (editingId) {
      const { error } = await supabase
        .from('categories')
        .update({ name: form.name.trim(), icon: form.icon, color: form.color })
        .eq('id', editingId);

      if (error) {
        toast.error("Помилка при оновленні: " + error.message);
        return;
      }
      toast.success("Категорію оновлено");
    }

    resetForm();
    refetch();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Видалити категорію "${name}"?`)) return;

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      toast.error("Помилка при видаленні: " + error.message);
      return;
    }
    toast.success("Категорію видалено");
    if (editingId === id) resetForm();
    refetch();
  };

  const handleToggleVisibility = async (id: string, currentVisible: boolean) => {
    const { error } = await supabase
      .from('categories')
      .update({ is_visible: !currentVisible })
      .eq('id', id);
    if (error) {
      toast.error("Помилка: " + error.message);
      return;
    }
    refetch();
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Управління категоріями</CardTitle>
            <CardDescription>Додавайте, редагуйте та видаляйте категорії послуг</CardDescription>
          </div>
          {!isAdding && !editingId && (
            <Button onClick={startAdd} size="sm">
              <Plus className="mr-2 h-4 w-4" /> Додати
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Add/Edit form */}
          {(isAdding || editingId) && (
            <div className="mb-6 rounded-lg border bg-muted/50 p-4 space-y-4">
              <h3 className="font-medium">{isAdding ? "Нова категорія" : "Редагування"}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Назва</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Назва категорії"
                  />
                </div>
                <div>
                  <Label>Іконка</Label>
                  <Select value={form.icon} onValueChange={v => setForm({ ...form, icon: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ICONS.map(icon => {
                        const Icon = getIconComponent(icon);
                        return (
                          <SelectItem key={icon} value={icon}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4" /> {icon}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Колір</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {AVAILABLE_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm({ ...form, color })}
                      className={cn(
                        "h-8 w-8 rounded-full bg-gradient-to-r transition-all",
                        color,
                        form.color === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100"
                      )}
                    />
                  ))}
                </div>
              </div>
              {/* Preview */}
              <div>
                <Label>Попередній перегляд</Label>
                <div className="mt-2">
                  {(() => {
                    const Icon = getIconComponent(form.icon);
                    return (
                      <span className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-white bg-gradient-to-r", form.color)}>
                        <Icon className="h-4 w-4" />
                        <span>{form.name || "Назва"}</span>
                      </span>
                    );
                  })()}
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

          {/* Categories list */}
          <div className="space-y-2">
            {categories.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Категорій поки немає</p>
            )}
            {categories.map(cat => {
              const Icon = getIconComponent(cat.icon);
              return (
                <div
                  key={cat.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3 transition-colors",
                    cat.is_visible ? "hover:bg-muted/50" : "opacity-50 bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-white text-sm bg-gradient-to-r", cat.color)}>
                      <Icon className="h-3.5 w-3.5" />
                      {cat.name}
                    </span>
                    <span className="text-xs text-muted-foreground">ID: {cat.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cat.is_visible}
                      onCheckedChange={() => handleToggleVisibility(cat.id, cat.is_visible)}
                      aria-label={`Видимість ${cat.name}`}
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
                      onClick={() => handleDelete(cat.id, cat.name)}
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
