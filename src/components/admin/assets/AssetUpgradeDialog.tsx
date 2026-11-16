import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users } from "lucide-react";
import { upgradeExtra, sharesForAmount, splitEqually, round2, formatShares } from "@/lib/assetUpgrade";

interface Item { id: string; name: string; total_price: number; category_id: string }
interface Cat { id: string; name: string }
interface Row { key: string; user_id: string; amount: string }

const NONE = "__none__";
const newRow = (): Row => ({ key: crypto.randomUUID(), user_id: "", amount: "" });

export function AssetUpgradeDialog({ open, onOpenChange, items, categories, defaultCategoryId, sharePrice, onDone }: {
  open: boolean; onOpenChange: (v: boolean) => void; items: Item[]; categories: Cat[];
  defaultCategoryId: string | null; sharePrice: number; onDone: () => void;
}) {
  const [oldId, setOldId] = useState<string>(NONE);
  const [sale, setSale] = useState("0");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [catId, setCatId] = useState<string>("");
  const [condition, setCondition] = useState("excellent");
  const [acquired, setAcquired] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOldId(NONE); setSale("0"); setName(""); setDesc(""); setPrice(""); setNote("");
    setCatId(defaultCategoryId || categories[0]?.id || "");
    setRows([newRow()]);
    supabase.rpc("get_users_for_admin").then(({ data }) => {
      setUsers(((data as any[]) || []).map(u => ({ id: u.id, full_name: u.full_name || "Без імені" }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name, "uk")));
    });
  }, [open]);

  const priceN = parseFloat(price) || 0;
  const saleN = oldId === NONE ? 0 : (parseFloat(sale) || 0);
  const oldItem = items.find(i => i.id === oldId);
  const extra = upgradeExtra(priceN, saleN);
  const contributed = round2(rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0));
  const totalNewShares = useMemo(() => rows.reduce((s, r) => s + sharesForAmount(parseFloat(r.amount) || 0, sharePrice), 0), [rows, sharePrice]);
  const saleTooBig = priceN > 0 && saleN > priceN;
  const filled = rows.filter(r => r.user_id);
  const uniqueUsers = new Set(filled.map(r => r.user_id)).size === filled.length;
  const rowsValid = extra === 0 || (rows.every(r => r.user_id && parseFloat(r.amount) > 0) && contributed === extra);
  const canSave = !!name.trim() && priceN > 0 && !!catId && sharePrice > 0 && !saleTooBig && rowsValid && uniqueUsers && !saving;

  const updateRow = (key: string, patch: Partial<Row>) => setRows(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r));
  const splitEq = () => {
    const parts = splitEqually(extra, rows.length);
    setRows(rs => rs.map((r, i) => ({ ...r, amount: String(parts[i]) })));
  };

  const submit = async () => {
    setSaving(true);
    const contributions = extra > 0 ? rows.map(r => ({ user_id: r.user_id, amount: round2(parseFloat(r.amount)) })) : [];
    const { data, error } = await supabase.rpc("asset_upgrade_with_contribution" as any, {
      _old_item_id: oldItem ? oldItem.id : null,
      _sale_amount: saleN,
      _category_id: catId, _new_name: name.trim(), _new_description: desc,
      _new_price: priceN, _condition: condition, _acquired_at: acquired || null,
      _contributions: contributions, _note: note.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message || "Не вдалося провести операцію"); return; }
    toast.success(`Операцію проведено. Випущено нових акцій: ${formatShares((data as any)?.shares_issued || 0)}`);
    onOpenChange(false); onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Заміна майна з доплатою</DialogTitle>
          <DialogDescription>Сума продажу старого майна залишається спільною. Доплата перетворюється на нові акції вкладників за поточним курсом.</DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <h4 className="font-semibold">1. Що продаємо / списуємо</h4>
          <Select value={oldId} onValueChange={(v) => { setOldId(v); const it = items.find(i => i.id === v); if (it) setSale(String(it.total_price)); }}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Оберіть старе майно" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Без списання (лише нова покупка)</SelectItem>
              {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} — {Number(i.total_price).toLocaleString("en-US")} $</SelectItem>)}
            </SelectContent>
          </Select>
          {oldItem && (
            <label className="block text-sm">Фактична сума продажу ($)
              <Input className="h-11 mt-1" type="number" min="0" step="0.01" value={sale} onChange={e => setSale(e.target.value)} />
            </label>
          )}
        </section>

        <section className="space-y-2">
          <h4 className="font-semibold">2. Що купуємо</h4>
          <Input className="h-11" placeholder="Назва нового майна" value={name} onChange={e => setName(e.target.value)} />
          <Textarea placeholder="Опис (необов'язково)" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-sm">Повна вартість ($)
              <Input className="h-11 mt-1" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
            </label>
            <div className="text-sm">Розділ
              <Select value={catId} onValueChange={setCatId}>
                <SelectTrigger className="h-11 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="text-sm">Стан
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="h-11 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Відмінний</SelectItem><SelectItem value="good">Добрий</SelectItem>
                  <SelectItem value="fair">Задовільний</SelectItem><SelectItem value="poor">Поганий</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="text-sm">Дата купівлі
              <Input className="h-11 mt-1" type="date" value={acquired} onChange={e => setAcquired(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="rounded-lg border bg-muted/40 p-3 grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">Покрито продажем:</span><span className="text-right font-medium">{round2(saleN).toFixed(2)} $</span>
          <span className="text-muted-foreground">Потрібна доплата:</span><span className="text-right font-bold">{extra.toFixed(2)} $</span>
          <span className="text-muted-foreground">Поточний курс акції:</span><span className="text-right font-medium">{sharePrice.toFixed(2)} $</span>
          <span className="text-muted-foreground">Нових акцій буде випущено:</span><span className="text-right font-bold text-primary">{formatShares(totalNewShares)}</span>
          {saleTooBig && <p className="col-span-2 text-destructive">Сума продажу більша за вартість нового майна — доплата не потрібна.</p>}
          {sharePrice <= 0 && <p className="col-span-2 text-destructive">Спершу встановіть офіційний курс акції.</p>}
        </section>

        {extra > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> 3. Хто доплачує</h4>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={splitEq}>Розділити порівну</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setRows(rs => [...rs, newRow()])}><Plus className="h-4 w-4 mr-1" />Вкладник</Button>
              </div>
            </div>
            {rows.map(r => (
              <div key={r.key} className="flex flex-col sm:flex-row gap-2 sm:items-center rounded-md border p-2">
                <Select value={r.user_id} onValueChange={v => updateRow(r.key, { user_id: v })}>
                  <SelectTrigger className="h-11 sm:flex-1"><SelectValue placeholder="Оберіть партнера" /></SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="h-11 sm:w-32" type="number" min="0" step="0.01" placeholder="Сума $" value={r.amount} onChange={e => updateRow(r.key, { amount: e.target.value })} />
                <span className="text-sm sm:w-32 text-muted-foreground">= {formatShares(sharesForAmount(parseFloat(r.amount) || 0, sharePrice))} акц.</span>
                <Button type="button" variant="ghost" size="icon" className="h-11 w-11" disabled={rows.length === 1} onClick={() => setRows(rs => rs.filter(x => x.key !== r.key))} aria-label="Прибрати вкладника"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <p className={`text-sm ${contributed === extra ? "text-muted-foreground" : "text-destructive"}`}>
              Внесено {contributed.toFixed(2)} $ із {extra.toFixed(2)} $
            </p>
            {!uniqueUsers && <p className="text-sm text-destructive">Один партнер вказаний двічі — об'єднайте суми.</p>}
          </section>
        )}

        <Textarea placeholder="Коментар до операції (необов'язково)" value={note} onChange={e => setNote(e.target.value)} rows={2} />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button size="lg" disabled={!canSave} onClick={submit}>{saving ? "Проводимо..." : "Провести операцію"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
