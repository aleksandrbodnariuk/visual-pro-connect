import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Pencil, Trash2, Package, FolderOpen, ChevronUp, ChevronDown,
  EyeOff, Eye, GripVertical, CheckCircle2, RefreshCw, History, Save, CalendarDays,
} from "lucide-react";

/* ───── types ───── */

interface AssetCategory {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
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

interface ValuationSnapshot {
  id: string;
  label: string;
  total_asset_value: number;
  total_shares: number;
  calculated_share_price: number;
  notes: string | null;
  created_at: string;
}

const CONDITION_LABELS: Record<string, string> = {
  excellent: "Відмінний",
  good: "Добрий",
  fair: "Задовільний",
  poor: "Поганий",
};

/* ───── component ───── */

export function AssetValuationTab() {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [items, setItems] = useState<AssetItem[]>([]);
  const [allItems, setAllItems] = useState<AssetItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);

  const { totalShares, sharePriceUsd, loading: settingsLoading, updateSharePrice, refetch: refetchSettings } = useCompanySettings();
  const [applying, setApplying] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [autoUpdateLoading, setAutoUpdateLoading] = useState(true);

  /* ── auto-update setting (persisted in site_settings) ── */

  const fetchAutoUpdateSetting = useCallback(async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", "auto_update_share_price")
      .maybeSingle();
    setAutoUpdate(data?.value === "true");
    setAutoUpdateLoading(false);
  }, []);

  const toggleAutoUpdate = async (checked: boolean) => {
    setAutoUpdate(checked);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: "auto_update_share_price", value: String(checked), updated_at: new Date().toISOString() });
    if (error) {
      console.error(error);
      toast.error("Не вдалося зберегти налаштування");
      setAutoUpdate(!checked);
      return;
    }
    toast.success(checked ? "Автооновлення ціни акції увімкнено" : "Автооновлення ціни акції вимкнено");
  };

  /** Recalculate and apply share price if auto-update is on */
  const maybeAutoUpdatePrice = useCallback(async () => {
    if (!autoUpdate) return;
    if (totalShares <= 0) return;
    // Fetch fresh total from DB
    const { data, error } = await supabase.from("asset_items").select("total_price");
    if (error) { console.error(error); return; }
    const freshTotal = (data || []).reduce((s, i) => s + Number(i.total_price || 0), 0);
    const newPrice = freshTotal / totalShares;
    await updateSharePrice(newPrice);
    refetchSettings();
  }, [autoUpdate, totalShares, updateSharePrice, refetchSettings]);

  // Valuation history
  const [snapshots, setSnapshots] = useState<ValuationSnapshot[]>([]);
  const [snapshotLabel, setSnapshotLabel] = useState(`Оцінка ${new Date().getFullYear()}`);
  const [snapshotNotes, setSnapshotNotes] = useState("");
  const [savingSnapshot, setSavingSnapshot] = useState(false);

  const fetchSnapshots = useCallback(async () => {
    const { data, error } = await supabase
      .from("asset_valuation_snapshots")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { console.error(error); return; }
    setSnapshots((data || []) as ValuationSnapshot[]);
  }, []);

  const handleSaveSnapshot = async () => {
    if (grandTotal <= 0 && totalShares <= 0) {
      toast.error("Немає даних для збереження");
      return;
    }
    const price = totalShares > 0 ? grandTotal / totalShares : 0;
    if (!confirm(`Зберегти оцінку "${snapshotLabel.trim()}" (вартість: ${grandTotal.toLocaleString("en-US")} $, ціна акції: ${price.toFixed(2)} $)?`)) return;
    setSavingSnapshot(true);
    const { error } = await supabase.from("asset_valuation_snapshots").insert({
      label: snapshotLabel.trim() || `Оцінка ${new Date().getFullYear()}`,
      total_asset_value: grandTotal,
      total_shares: totalShares,
      calculated_share_price: price,
      notes: snapshotNotes.trim() || null,
      created_by: (await supabase.auth.getSession()).data.session?.user?.id || null,
    });
    setSavingSnapshot(false);
    if (error) { toast.error("Помилка збереження"); console.error(error); return; }
    toast.success("Оцінку збережено в історію");
    setSnapshotNotes("");
    fetchSnapshots();
  };

  const handleDeleteSnapshot = async (id: string) => {
    if (!confirm("Видалити цей запис з історії?")) return;
    const { error } = await supabase.from("asset_valuation_snapshots").delete().eq("id", id);
    if (error) { toast.error("Помилка видалення"); return; }
    toast.success("Запис видалено");
    fetchSnapshots();
  };

  // Category CRUD
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<AssetCategory | null>(null);
  const [catName, setCatName] = useState("");

  // Item CRUD
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AssetItem | null>(null);
  const [form, setForm] = useState({ name: "", description: "", quantity: "1", unit_price: "0", condition: "good", acquired_at: "" });

  /* ── fetch ── */

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("asset_categories")
      .select("*")
      .order("sort_order");
    if (error) { console.error(error); return; }
    const all = (data || []) as AssetCategory[];
    setCategories(all);
    // auto-select first visible
    if (!selectedCategoryId || !all.find((c) => c.id === selectedCategoryId)) {
      const first = all.find((c) => c.is_active) || all[0];
      if (first) setSelectedCategoryId(first.id);
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
    setItems((data || []) as AssetItem[]);
    setLoading(false);
  }, [selectedCategoryId]);

  const fetchAllItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("asset_items")
      .select("*");
    if (error) { console.error(error); return; }
    setAllItems((data || []) as AssetItem[]);
  }, []);

  useEffect(() => { fetchCategories(); fetchAllItems(); fetchAutoUpdateSetting(); }, []);
  useEffect(() => { fetchItems(); }, [selectedCategoryId]);

  // Refresh allItems when items change (after add/edit/delete) + auto-update price
  const refreshAll = async () => {
    await Promise.all([fetchItems(), fetchAllItems()]);
    // Auto-update runs after fresh data is loaded
    await maybeAutoUpdatePrice();
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const totalValue = items.reduce((s, i) => s + Number(i.total_price || 0), 0);
  const grandTotal = allItems.reduce((s, i) => s + Number(i.total_price || 0), 0);

  // Per-category totals
  const categoryTotals = categories.reduce<Record<string, number>>((acc, cat) => {
    acc[cat.id] = allItems
      .filter((i) => i.category_id === cat.id)
      .reduce((s, i) => s + Number(i.total_price || 0), 0);
    return acc;
  }, {});

  // Share price preview
  const previewSharePrice = totalShares > 0 ? grandTotal / totalShares : null;

  const visibleCategories = showHidden ? categories : categories.filter((c) => c.is_active);

  /* ── category CRUD ── */

  const openAddCat = () => {
    setEditingCat(null);
    setCatName("");
    setCatDialogOpen(true);
  };

  const openEditCat = (cat: AssetCategory) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatDialogOpen(true);
  };

  const handleSaveCat = async () => {
    const trimmed = catName.trim();
    if (!trimmed) { toast.error("Назва обов'язкова"); return; }

    if (editingCat) {
      const { error } = await supabase
        .from("asset_categories")
        .update({ name: trimmed })
        .eq("id", editingCat.id);
      if (error) { toast.error("Помилка оновлення"); console.error(error); return; }
      toast.success("Розділ оновлено");
    } else {
      const maxOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) : 0;
      const { error } = await supabase
        .from("asset_categories")
        .insert({ name: trimmed, sort_order: maxOrder + 1 });
      if (error) { toast.error("Помилка додавання"); console.error(error); return; }
      toast.success("Розділ додано");
    }
    setCatDialogOpen(false);
    fetchCategories();
  };

  const handleToggleCatActive = async (cat: AssetCategory) => {
    const { error } = await supabase
      .from("asset_categories")
      .update({ is_active: !cat.is_active })
      .eq("id", cat.id);
    if (error) { toast.error("Помилка"); console.error(error); return; }
    toast.success(cat.is_active ? "Розділ приховано" : "Розділ активовано");
    fetchCategories();
  };

  const handleMoveCat = async (cat: AssetCategory, direction: "up" | "down") => {
    const idx = categories.findIndex((c) => c.id === cat.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;

    const other = categories[swapIdx];
    await Promise.all([
      supabase.from("asset_categories").update({ sort_order: other.sort_order }).eq("id", cat.id),
      supabase.from("asset_categories").update({ sort_order: cat.sort_order }).eq("id", other.id),
    ]);
    fetchCategories();
  };

  const handleDeleteCat = async (cat: AssetCategory) => {
    if (!confirm(`Видалити розділ "${cat.name}" та все майно в ньому?`)) return;
    const { error } = await supabase.from("asset_categories").delete().eq("id", cat.id);
    if (error) { toast.error("Помилка видалення"); console.error(error); return; }
    toast.success("Розділ видалено");
    if (selectedCategoryId === cat.id) setSelectedCategoryId(null);
    fetchCategories();
  };

  /* ── item CRUD ── */

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
    refreshAll();
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Видалити цей елемент?")) return;
    const { error } = await supabase.from("asset_items").delete().eq("id", id);
    if (error) { toast.error("Помилка видалення"); return; }
    toast.success("Видалено");
    refreshAll();
  };

  /* ── render ── */

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[560px]">
      {/* ── Left panel: categories ── */}
      <Card className="lg:w-80 shrink-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-5 w-5" /> Розділи
            </CardTitle>
            <Button size="sm" variant="outline" onClick={openAddCat}>
              <Plus className="h-4 w-4 mr-1" /> Новий
            </Button>
          </div>
          <button
            onClick={() => setShowHidden(!showHidden)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left mt-1"
          >
            {showHidden ? "Сховати приховані" : "Показати приховані"}
          </button>
        </CardHeader>

        <CardContent className="px-3 pb-3 space-y-1">
          {visibleCategories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Немає розділів</p>
          )}
          {visibleCategories.map((cat, idx) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <div
                key={cat.id}
                className={`group flex items-center gap-1 rounded-lg transition-colors ${
                  isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                } ${!cat.is_active ? "opacity-50" : ""}`}
              >
                <GripVertical className="h-4 w-4 shrink-0 ml-1 text-muted-foreground/40" />

                <button
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className="flex-1 text-left px-2 py-3 text-sm font-medium min-w-0"
                >
                  <span className="block truncate">{cat.name}{!cat.is_active && <span className="ml-1 text-xs">(прихований)</span>}</span>
                  {categoryTotals[cat.id] > 0 && (
                    <span className={`block text-xs mt-0.5 ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {categoryTotals[cat.id].toLocaleString("en-US")} $
                    </span>
                  )}
                </button>

                {/* Action buttons — visible on hover or when selected */}
                <div className={`flex items-center gap-0.5 pr-1 shrink-0 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${isSelected ? "hover:bg-primary-foreground/20 text-primary-foreground" : ""}`}
                    onClick={(e) => { e.stopPropagation(); handleMoveCat(cat, "up"); }}
                    disabled={idx === 0}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${isSelected ? "hover:bg-primary-foreground/20 text-primary-foreground" : ""}`}
                    onClick={(e) => { e.stopPropagation(); handleMoveCat(cat, "down"); }}
                    disabled={idx === visibleCategories.length - 1}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${isSelected ? "hover:bg-primary-foreground/20 text-primary-foreground" : ""}`}
                    onClick={(e) => { e.stopPropagation(); handleToggleCatActive(cat); }}
                  >
                    {cat.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${isSelected ? "hover:bg-primary-foreground/20 text-primary-foreground" : ""}`}
                    onClick={(e) => { e.stopPropagation(); openEditCat(cat); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 text-destructive ${isSelected ? "hover:bg-primary-foreground/20" : ""}`}
                    onClick={(e) => { e.stopPropagation(); handleDeleteCat(cat); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Category dialog ── */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Перейменувати розділ" : "Новий розділ"}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Назва розділу"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveCat()}
            autoFocus
          />
          <DialogFooter>
            <Button onClick={handleSaveCat}>{editingCat ? "Зберегти" : "Створити"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Right panel: items ── */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            {selectedCategory?.name || "Оберіть розділ"}
          </h3>
          {selectedCategoryId && (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm px-3 py-1">
                Розділ: {totalValue.toLocaleString("en-US")} $
              </Badge>
              <Button size="default" onClick={openAddItem}>
                <Plus className="h-4 w-4 mr-1" /> Додати майно
              </Button>
            </div>
          )}
        </div>

        {/* Item dialog */}
        <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">{editingItem ? "Редагувати" : "Додати"} майно</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Назва *</label>
                <Input className="h-11 text-base" placeholder="Назва майна" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Опис / примітка</label>
                <Textarea className="min-h-[80px] text-base" placeholder="Додаткова інформація" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Кількість</label>
                  <Input className="h-11 text-base" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Ціна за од. ($)</label>
                  <Input className="h-11 text-base" type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
                </div>
              </div>

              {/* Auto-calculated subtotal */}
              <div className="rounded-lg bg-muted/60 border border-border px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Підсумок по позиції:</span>
                <span className="text-lg font-bold text-foreground">
                  {((parseInt(form.quantity) || 0) * (parseFloat(form.unit_price) || 0)).toLocaleString("en-US")} $
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Стан</label>
                  <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Дата придбання</label>
                  <Input className="h-11" type="date" value={form.acquired_at} onChange={(e) => setForm({ ...form, acquired_at: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Скасувати</Button>
              <Button size="lg" onClick={handleSaveItem}>{editingItem ? "Зберегти зміни" : "Додати майно"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {selectedCategoryId && (
          <Card>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Назва</TableHead>
                    <TableHead className="hidden sm:table-cell">Опис</TableHead>
                    <TableHead className="text-right">К-ть</TableHead>
                    <TableHead className="text-right">Ціна/од.</TableHead>
                    <TableHead className="text-right">Сума</TableHead>
                    <TableHead className="hidden sm:table-cell">Стан</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Завантаження...</TableCell></TableRow>
                  ) : items.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Немає записів у цьому розділі</TableCell></TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium max-w-[180px] truncate">{item.name}</TableCell>
                        <TableCell className="hidden sm:table-cell max-w-[220px] truncate text-muted-foreground text-xs">{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{Number(item.unit_price).toLocaleString("uk-UA")}</TableCell>
                        <TableCell className="text-right font-semibold">{Number(item.total_price).toLocaleString("uk-UA")}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary" className="text-xs">{CONDITION_LABELS[item.condition || "good"] || item.condition}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditItem(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* ── Auto-update toggle ── */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Автоматично оновлювати офіційну ціну акції при зміні майна</span>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  {autoUpdate
                    ? "Ціна акції оновлюється автоматично після кожної зміни майна"
                    : "Ціна акції оновлюється тільки вручну через кнопку нижче"}
                </p>
              </div>
              <Switch
                checked={autoUpdate}
                onCheckedChange={toggleAutoUpdate}
                disabled={autoUpdateLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Grand total + share price preview ── */}
        <Card className="border-primary/30">
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Загальна вартість усього майна</p>
                <p className="text-2xl font-bold text-foreground">{grandTotal.toLocaleString("en-US")} $</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Розрахована ціна акції (майно / {totalShares || "?"} акцій)</p>
                {settingsLoading ? (
                  <p className="text-lg text-muted-foreground">Завантаження...</p>
                ) : previewSharePrice !== null ? (
                  <p className="text-2xl font-bold text-primary">{previewSharePrice.toFixed(2)} $</p>
                ) : (
                  <p className="text-sm text-destructive">total_shares = 0 або не налаштовано</p>
                )}
              </div>
            </div>

            {/* Current vs calculated comparison + manual apply button (only when auto-update is OFF) */}
            {!settingsLoading && previewSharePrice !== null && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg bg-muted/50 border border-border px-4 py-3">
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Поточна ціна акції:</span>
                    <span className="font-semibold">{sharePriceUsd.toFixed(2)} $</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Розрахована ціна:</span>
                    <span className="font-semibold text-primary">{previewSharePrice.toFixed(2)} $</span>
                  </div>
                  {autoUpdate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ⚡ Автооновлення увімкнено — ціна синхронізується автоматично
                    </p>
                  )}
                </div>
                {!autoUpdate && (
                  <Button
                    onClick={async () => {
                      if (!confirm(`Встановити нову ціну акції: ${previewSharePrice.toFixed(2)} $ (замість ${sharePriceUsd.toFixed(2)} $)?`)) return;
                      setApplying(true);
                      const ok = await updateSharePrice(previewSharePrice);
                      setApplying(false);
                      if (ok) toast.success(`Ціну акції оновлено: ${previewSharePrice.toFixed(2)} $`);
                    }}
                    disabled={applying}
                    className="shrink-0"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {applying ? "Збереження..." : "Застосувати розраховану ціну"}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
