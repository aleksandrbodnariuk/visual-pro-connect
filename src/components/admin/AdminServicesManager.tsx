import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Package, ChevronDown, ChevronRight, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
}

interface ServicePkg {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  sort_order: number;
}

interface Service {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  packages: ServicePkg[];
}

export function AdminServicesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // New service form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");

  // Expanded services for inline package editing
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // New package form (per service)
  const [addingPkgFor, setAddingPkgFor] = useState<string | null>(null);
  const [pkgName, setPkgName] = useState("");
  const [pkgDesc, setPkgDesc] = useState("");
  const [pkgPrice, setPkgPrice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, svcRes, pkgRes] = await Promise.all([
        supabase.from("categories").select("id, name").order("sort_order"),
        supabase.from("services").select("*").order("sort_order"),
        supabase.from("service_packages").select("*").order("sort_order"),
      ]);

      setCategories(catRes.data || []);

      const pkgMap = new Map<string, ServicePkg[]>();
      (pkgRes.data || []).forEach((p: any) => {
        if (!pkgMap.has(p.service_id)) pkgMap.set(p.service_id, []);
        pkgMap.get(p.service_id)!.push(p);
      });

      const svcs: Service[] = (svcRes.data || []).map((s: any) => ({
        ...s,
        packages: pkgMap.get(s.id) || [],
      }));

      setServices(svcs);
    } catch (err) {
      console.error("Error loading services:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addService = async () => {
    if (!newName.trim() || !newCategoryId) {
      toast.error("Вкажіть назву та категорію");
      return;
    }
    const { error } = await supabase.from("services").insert({
      name: newName.trim(),
      description: newDesc.trim() || null,
      category_id: newCategoryId,
      sort_order: services.length,
    });
    if (error) {
      toast.error("Помилка створення послуги");
      return;
    }
    setNewName("");
    setNewDesc("");
    toast.success("Послугу додано");
    loadData();
  };

  const toggleServiceActive = async (svc: Service) => {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !svc.is_active })
      .eq("id", svc.id);
    if (error) {
      toast.error("Помилка оновлення");
      return;
    }
    setServices((prev) =>
      prev.map((s) => (s.id === svc.id ? { ...s, is_active: !s.is_active } : s))
    );
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast.error("Помилка видалення");
      return;
    }
    toast.success("Послугу видалено");
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const addPackage = async (serviceId: string) => {
    if (!pkgName.trim() || !pkgPrice) {
      toast.error("Вкажіть назву та ціну пакету");
      return;
    }
    const { error } = await supabase.from("service_packages").insert({
      service_id: serviceId,
      name: pkgName.trim(),
      description: pkgDesc.trim() || null,
      price: parseFloat(pkgPrice),
      sort_order: 0,
    });
    if (error) {
      toast.error("Помилка створення пакету");
      return;
    }
    setPkgName("");
    setPkgDesc("");
    setPkgPrice("");
    setAddingPkgFor(null);
    toast.success("Пакет додано");
    loadData();
  };

  const deletePackage = async (id: string) => {
    const { error } = await supabase.from("service_packages").delete().eq("id", id);
    if (error) {
      toast.error("Помилка видалення пакету");
      return;
    }
    toast.success("Пакет видалено");
    loadData();
  };

  const togglePkgActive = async (pkg: ServicePkg) => {
    const { error } = await supabase
      .from("service_packages")
      .update({ is_active: !pkg.is_active })
      .eq("id", pkg.id);
    if (error) return;
    loadData();
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || id;

  // Group services by category
  const grouped = categories
    .map((cat) => ({
      category: cat,
      services: services.filter((s) => s.category_id === cat.id),
    }))
    .filter((g) => g.services.length > 0);

  const ungrouped = services.filter((s) => !categories.find((c) => c.id === s.category_id));

  return (
    <div className="space-y-6">
      {/* Add new service */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Додати послугу</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Назва</Label>
              <Input
                placeholder="Наприклад: Фотосесія"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Категорія</Label>
              <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть категорію" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Опис (необов'язково)</Label>
              <Textarea
                placeholder="Короткий опис послуги"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <Button onClick={addService} className="mt-3" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Додати
          </Button>
        </CardContent>
      </Card>

      {/* Services list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Послуги та пакети</CardTitle>
          <CardDescription>Керуйте послугами, пакетами та цінами</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : services.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Послуг ще немає. Додайте першу послугу вище.
            </p>
          ) : (
            <div className="space-y-4">
              {grouped.map((g) => (
                <div key={g.category.id}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {g.category.name}
                  </h4>
                  <div className="space-y-2">
                    {g.services.map((svc) => (
                      <ServiceRow
                        key={svc.id}
                        svc={svc}
                        isExpanded={expanded.has(svc.id)}
                        onToggleExpand={() => toggleExpanded(svc.id)}
                        onToggleActive={() => toggleServiceActive(svc)}
                        onDelete={() => deleteService(svc.id)}
                        addingPkg={addingPkgFor === svc.id}
                        onStartAddPkg={() => {
                          setAddingPkgFor(svc.id);
                          setPkgName("");
                          setPkgDesc("");
                          setPkgPrice("");
                        }}
                        onCancelAddPkg={() => setAddingPkgFor(null)}
                        pkgName={pkgName}
                        pkgDesc={pkgDesc}
                        pkgPrice={pkgPrice}
                        onPkgNameChange={setPkgName}
                        onPkgDescChange={setPkgDesc}
                        onPkgPriceChange={setPkgPrice}
                        onSavePkg={() => addPackage(svc.id)}
                        onDeletePkg={deletePackage}
                        onTogglePkgActive={togglePkgActive}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {ungrouped.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Без категорії</h4>
                  <div className="space-y-2">
                    {ungrouped.map((svc) => (
                      <ServiceRow
                        key={svc.id}
                        svc={svc}
                        isExpanded={expanded.has(svc.id)}
                        onToggleExpand={() => toggleExpanded(svc.id)}
                        onToggleActive={() => toggleServiceActive(svc)}
                        onDelete={() => deleteService(svc.id)}
                        addingPkg={addingPkgFor === svc.id}
                        onStartAddPkg={() => {
                          setAddingPkgFor(svc.id);
                          setPkgName("");
                          setPkgDesc("");
                          setPkgPrice("");
                        }}
                        onCancelAddPkg={() => setAddingPkgFor(null)}
                        pkgName={pkgName}
                        pkgDesc={pkgDesc}
                        pkgPrice={pkgPrice}
                        onPkgNameChange={setPkgName}
                        onPkgDescChange={setPkgDesc}
                        onPkgPriceChange={setPkgPrice}
                        onSavePkg={() => addPackage(svc.id)}
                        onDeletePkg={deletePackage}
                        onTogglePkgActive={togglePkgActive}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Service Row ──
function ServiceRow({
  svc,
  isExpanded,
  onToggleExpand,
  onToggleActive,
  onDelete,
  addingPkg,
  onStartAddPkg,
  onCancelAddPkg,
  pkgName,
  pkgDesc,
  pkgPrice,
  onPkgNameChange,
  onPkgDescChange,
  onPkgPriceChange,
  onSavePkg,
  onDeletePkg,
  onTogglePkgActive,
}: {
  svc: Service;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  addingPkg: boolean;
  onStartAddPkg: () => void;
  onCancelAddPkg: () => void;
  pkgName: string;
  pkgDesc: string;
  pkgPrice: string;
  onPkgNameChange: (v: string) => void;
  onPkgDescChange: (v: string) => void;
  onPkgPriceChange: (v: string) => void;
  onSavePkg: () => void;
  onDeletePkg: (id: string) => void;
  onTogglePkgActive: (pkg: ServicePkg) => void;
}) {
  return (
    <div className="border rounded-lg">
      {/* Service header */}
      <div className="flex items-center gap-2 p-3">
        <button onClick={onToggleExpand} className="p-0.5 hover:bg-muted rounded">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <span className={`font-medium text-sm flex-1 ${!svc.is_active ? "opacity-50" : ""}`}>
          {svc.name}
        </span>
        <Badge variant="outline" className="text-xs">
          {svc.packages.length} пакет{svc.packages.length === 1 ? "" : "ів"}
        </Badge>
        <Switch checked={svc.is_active} onCheckedChange={onToggleActive} />
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>

      {svc.description && isExpanded && (
        <p className="px-3 pb-2 text-xs text-muted-foreground">{svc.description}</p>
      )}

      {/* Packages */}
      {isExpanded && (
        <div className="border-t px-3 py-2 space-y-2">
          {svc.packages.length === 0 && !addingPkg && (
            <p className="text-xs text-muted-foreground py-1">Пакетів ще немає</p>
          )}

          {svc.packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`flex items-center gap-2 text-sm py-1 ${!pkg.is_active ? "opacity-50" : ""}`}
            >
              <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{pkg.name}</span>
              {pkg.description && (
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {pkg.description}
                </span>
              )}
              <span className="font-medium tabular-nums">{pkg.price} $</span>
              <Switch
                checked={pkg.is_active}
                onCheckedChange={() => onTogglePkgActive(pkg)}
                className="scale-75"
              />
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onDeletePkg(pkg.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}

          {/* Add package form */}
          {addingPkg ? (
            <div className="space-y-2 pt-2 border-t">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Назва пакету"
                  value={pkgName}
                  onChange={(e) => onPkgNameChange(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="Ціна ($)"
                  type="number"
                  min="0"
                  value={pkgPrice}
                  onChange={(e) => onPkgPriceChange(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Input
                placeholder="Опис (необов'язково)"
                value={pkgDesc}
                onChange={(e) => onPkgDescChange(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={onSavePkg}>
                  <Save className="h-3 w-3 mr-1" />
                  Зберегти
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancelAddPkg}>
                  <X className="h-3 w-3 mr-1" />
                  Скасувати
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onStartAddPkg}>
              <Plus className="h-3 w-3 mr-1" />
              Додати пакет
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
