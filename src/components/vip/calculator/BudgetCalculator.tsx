import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

interface Item {
  id: string;
  name: string;
  qty: number;
  price: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0
  );

export function BudgetCalculator() {
  const [items, setItems] = useState<Item[]>([
    { id: crypto.randomUUID(), name: "Послуга фотографа", qty: 1, price: 8000 },
  ]);
  const [overheadPct, setOverheadPct] = useState(10);
  const [contingencyPct, setContingencyPct] = useState(5);

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + (i.qty || 0) * (i.price || 0), 0),
    [items]
  );
  const overhead = (subtotal * overheadPct) / 100;
  const contingency = (subtotal * contingencyPct) / 100;
  const total = subtotal + overhead + contingency;

  const update = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const add = () =>
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", qty: 1, price: 0 },
    ]);

  const remove = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Статті витрат</h3>
          <Button size="sm" variant="outline" onClick={add}>
            <Plus className="h-4 w-4 mr-1" /> Додати
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-12 gap-2 items-end border rounded-md p-2"
            >
              <div className="col-span-12 md:col-span-5">
                <Label className="text-xs">Назва</Label>
                <Input
                  value={item.name}
                  onChange={(e) => update(item.id, { name: e.target.value })}
                  placeholder="Наприклад: оренда студії"
                />
              </div>
              <div className="col-span-6 md:col-span-2">
                <Label className="text-xs">К-сть</Label>
                <Input
                  type="number"
                  min={0}
                  value={item.qty}
                  onChange={(e) =>
                    update(item.id, { qty: parseFloat(e.target.value) || 0 })
                  }
                  inputMode="decimal"
                />
              </div>
              <div className="col-span-6 md:col-span-3">
                <Label className="text-xs">Ціна за од., ₴</Label>
                <Input
                  type="number"
                  min={0}
                  value={item.price}
                  onChange={(e) =>
                    update(item.id, { price: parseFloat(e.target.value) || 0 })
                  }
                  inputMode="decimal"
                />
              </div>
              <div className="col-span-12 md:col-span-2 flex flex-col">
                <Label className="text-xs">Сума</Label>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm truncate">
                    {fmt(item.qty * item.price)}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-destructive"
                    onClick={() => remove(item.id)}
                    disabled={items.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Накладні витрати, %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={overheadPct}
            onChange={(e) => setOverheadPct(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label className="text-xs">Резерв на ризики, %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={contingencyPct}
            onChange={(e) => setContingencyPct(parseFloat(e.target.value) || 0)}
          />
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <Row label="Сума витрат" value={subtotal} />
        <Row label={`Накладні (${overheadPct}%)`} value={overhead} />
        <Row label={`Резерв (${contingencyPct}%)`} value={contingency} />
        <div className="border-t pt-2 mt-2 flex items-center justify-between">
          <span className="font-bold">Підсумок</span>
          <span className="font-bold text-lg text-amber-600">
            {fmt(total)} ₴
          </span>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{fmt(value)} ₴</span>
    </div>
  );
}