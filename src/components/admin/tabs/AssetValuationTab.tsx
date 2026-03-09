import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Package, FolderOpen } from "lucide-react";

interface AssetCategory {
  id: string;
  name: string;
  sort_order: number;
}

interface AssetItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  condition: string | null;
  acquired_at: string | null;
  created_at: string;
}

const CONDITION_LABELS: Record<string, string> = {
  excellent: "Відмінний",
  good: "Добрий",
  fair: "Задовільний",
  poor: "Поганий",
};

export function AssetValuationTab() {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [items, setItems] = useState<AssetItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Item form state
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AssetItem | null>(null);
  const [form, setForm] = useState({ name: "", description: "", quantity: "1", unit_price: "0", condition: "good", acquired_at: "" });

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("asset_categories")
      .select("*")
      .order("sort_order");
    if (error) { console.error(error); return; }
    setCategories(data || []);
    if (!selectedCategoryId && data && data.length > 0) {
      setSelectedCategoryId(data[0].id);
    }
  }, [selectedCategoryId]);

  const fetchItems = useCallback(async () => {
    if (!selectedCategoryId) { setItems([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("asset_items")
      .select("*")
      .eq("category_id", selectedCategoryId)
      .order("created_at", { ascending: true });
    if (error) { console.error(error); setLoading(false); return; }
    setItems(data || []);
    setLoading(false);
  }, [selectedCategoryId]);

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchItems(); }, [selectedCategoryId]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const totalValue = items.reduce((s, i) => s + Number(i.total_price || 0), 0);
  const grandTotal = categories.length > 0
    ? items // we only show per-category total; grand total needs all items
    : 0;

  const openAddItem = () => {
    setEditingItem(null);
    setForm({ name: "", description: "", quantity: "1", unit_price: "0", condition: "good", acquired_at: "" });
    setItemDialogOpen(true);
  };

  const openEditItem = (item: AssetItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || "",
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
      condition: item.condition || "good",
      acquired_at: item.acquired_at || "",
    });
    setItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!form.name.trim()) { toast.error("Назва обов'язкова"); return; }
    const payload = {
      category_id: selectedCategoryId!,
      name: form.name.trim(),
      description: form.description.trim() || null,
      quantity: parseInt(form.quantity) || 1,
      unit_price: parseFloat(form.unit_price) || 0,
      condition: form.condition,
      acquired_at: form.acquired_at || null,
    };

    if (editingItem) {
      const { error } = await supabase.from("asset_items").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editingItem.id);
      if (error) { toast.error("Помилка оновлення"); console.error(error); return; }
      toast.success("Оновлено");
    } else {
      const { error } = await supabase.from("asset_items").insert(payload);
      if (error) { toast.error("Помилка додавання"); console.error(error); return; }
      toast.success("Додано");
    }
    setItemDialogOpen(false);
    fetchItems();
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Видалити цей елемент?")) return;
    const { error } = await supabase.from("asset_items").delete().eq("id", id);
    if (error) { toast.error("Помилка видалення"); return; }
    toast.success("Видалено");
    fetchItems();
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 min-h-[500px]">
      {/* Sidebar — categories */}
      <Card className="md:w-64 shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4" /> Розділи
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 space-y-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                selectedCategoryId === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Main content — items list */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            {selectedCategory?.name || "Оберіть розділ"}
          </h3>
          {selectedCategoryId && (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm">
                Вартість розділу: {totalValue.toLocaleString("uk-UA")} грн
              </Badge>
              <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openAddItem}>
                    <Plus className="h-4 w-4 mr-1" /> Додати
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingItem ? "Редагувати" : "Додати"} майно</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Назва *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <Textarea placeholder="Опис" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Кількість</label>
                        <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Ціна за од. (грн)</label>
                        <Input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Стан</label>
                        <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Дата придбання</label>
                        <Input type="date" value={form.acquired_at} onChange={(e) => setForm({ ...form, acquired_at: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveItem}>{editingItem ? "Зберегти" : "Додати"}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {selectedCategoryId && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead className="hidden sm:table-cell">Опис</TableHead>
                  <TableHead className="text-right">К-ть</TableHead>
                  <TableHead className="text-right">Ціна/од.</TableHead>
                  <TableHead className="text-right">Сума</TableHead>
                  <TableHead className="hidden sm:table-cell">Стан</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Завантаження...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Немає записів</TableCell></TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium max-w-[160px] truncate">{item.name}</TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[200px] truncate text-muted-foreground text-xs">{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{Number(item.unit_price).toLocaleString("uk-UA")}</TableCell>
                      <TableCell className="text-right font-semibold">{Number(item.total_price).toLocaleString("uk-UA")}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className="text-xs">{CONDITION_LABELS[item.condition || "good"] || item.condition}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditItem(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
