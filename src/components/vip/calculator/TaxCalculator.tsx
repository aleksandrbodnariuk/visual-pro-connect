import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const fmt = (n: number) =>
  new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0
  );

type Regime = "fop1" | "fop2" | "fop3" | "fop3vat" | "common";

const REGIMES: Record<Regime, { label: string; rate: number; note: string }> = {
  fop1: {
    label: "ФОП 1 група (фікс.)",
    rate: 0,
    note: "Фіксована ставка ЄП залежно від ставки місцевої ради. Введіть вручну, якщо потрібно.",
  },
  fop2: {
    label: "ФОП 2 група (фікс.)",
    rate: 0,
    note: "Фіксована ставка ЄП до 20% мін. зарплати. Введіть вручну.",
  },
  fop3: {
    label: "ФОП 3 група, без ПДВ (5%)",
    rate: 5,
    note: "Єдиний податок 5% від обороту.",
  },
  fop3vat: {
    label: "ФОП 3 група, з ПДВ (3% + 20% ПДВ)",
    rate: 3,
    note: "ЄП 3% від обороту + 20% ПДВ зверху на дохід.",
  },
  common: {
    label: "Загальна система (18% + 1.5%)",
    rate: 19.5,
    note: "ПДФО 18% + ВЗ 1.5% з чистого доходу.",
  },
};

export function TaxCalculator() {
  const [income, setIncome] = useState(20000);
  const [expenses, setExpenses] = useState(0);
  const [platformFeePct, setPlatformFeePct] = useState(0);
  const [regime, setRegime] = useState<Regime>("fop3");
  const [customRate, setCustomRate] = useState(0);

  const calc = useMemo(() => {
    const platformFee = (income * platformFeePct) / 100;
    const afterFee = income - platformFee;
    const r = REGIMES[regime];
    let tax = 0;
    let vat = 0;
    if (regime === "common") {
      const base = Math.max(0, afterFee - expenses);
      tax = base * 0.195;
    } else if (regime === "fop3") {
      tax = afterFee * 0.05;
    } else if (regime === "fop3vat") {
      tax = afterFee * 0.03;
      vat = afterFee * 0.2;
    } else {
      tax = customRate;
    }
    const net = afterFee - tax - vat - expenses;
    return { platformFee, afterFee, tax, vat, net, note: r.note };
  }, [income, expenses, platformFeePct, regime, customRate]);

  const fixed = regime === "fop1" || regime === "fop2";

  return (
    <div className="space-y-4">
      <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Дохід (оборот), ₴</Label>
          <Input
            type="number"
            min={0}
            value={income}
            onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label className="text-xs">Витрати (для загальної системи), ₴</Label>
          <Input
            type="number"
            min={0}
            value={expenses}
            onChange={(e) => setExpenses(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label className="text-xs">Комісія платформи/банку, %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={platformFeePct}
            onChange={(e) =>
              setPlatformFeePct(parseFloat(e.target.value) || 0)
            }
          />
        </div>
        <div>
          <Label className="text-xs">Податковий режим</Label>
          <Select value={regime} onValueChange={(v) => setRegime(v as Regime)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(REGIMES) as Regime[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {REGIMES[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {fixed && (
          <div className="md:col-span-2">
            <Label className="text-xs">Фіксована сума податку, ₴</Label>
            <Input
              type="number"
              min={0}
              value={customRate}
              onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
            />
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <Row label="Дохід" value={income} />
        <Row label={`Комісія платформи (${platformFeePct}%)`} value={-calc.platformFee} />
        <Row label="Податок (ЄП/ПДФО+ВЗ)" value={-calc.tax} />
        {calc.vat > 0 && <Row label="ПДВ 20%" value={-calc.vat} />}
        {regime === "common" && expenses > 0 && (
          <Row label="Витрати (для розрахунку бази)" value={-expenses} />
        )}
        <div className="border-t pt-2 mt-2 flex items-center justify-between">
          <span className="font-bold">До отримання</span>
          <span className="font-bold text-lg text-amber-600">{fmt(calc.net)} ₴</span>
        </div>
        <p className="text-xs text-muted-foreground pt-2">{calc.note}</p>
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