import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fmt = (n: number) =>
  new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0
  );

export function RoiCalculator() {
  const [revenue, setRevenue] = useState(20000);
  const [costs, setCosts] = useState(8000);
  const [hours, setHours] = useState(20);

  const result = useMemo(() => {
    const profit = revenue - costs;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const markup = costs > 0 ? (profit / costs) * 100 : 0;
    const roi = costs > 0 ? (profit / costs) * 100 : 0;
    const hourly = hours > 0 ? profit / hours : 0;
    return { profit, margin, markup, roi, hourly };
  }, [revenue, costs, hours]);

  return (
    <div className="space-y-4">
      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Дохід, ₴</Label>
          <Input
            type="number"
            min={0}
            value={revenue}
            onChange={(e) => setRevenue(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label className="text-xs">Витрати, ₴</Label>
          <Input
            type="number"
            min={0}
            value={costs}
            onChange={(e) => setCosts(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label className="text-xs">Відпрацьовано годин</Label>
          <Input
            type="number"
            min={0}
            value={hours}
            onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
          />
        </div>
      </Card>

      <Card className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="Чистий прибуток" value={`${fmt(result.profit)} ₴`} highlight />
        <Stat label="Маржа" value={`${fmt(result.margin)}%`} />
        <Stat label="Націнка" value={`${fmt(result.markup)}%`} />
        <Stat label="ROI" value={`${fmt(result.roi)}%`} />
        <Stat label="Дохід/година" value={`${fmt(result.hourly)} ₴`} />
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={
          "text-lg font-bold mt-1 " + (highlight ? "text-amber-600" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}