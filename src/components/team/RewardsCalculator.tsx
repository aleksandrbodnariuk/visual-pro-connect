import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Plus, Trash2, XCircle } from 'lucide-react';
import { BV_PER_PV, PATH_TO_BRONZE, calcRewards } from '@/lib/amwayRewards';

type Leg = { name: string; pv: number; isNew?: boolean };
const money = (n: number) => n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₴';
const PRESETS: { label: string; ppv: number; legs: number[] }[] = [
  { label: 'Приклад 15% + Бронза', ppv: 100, legs: [200, 200, 200, 600, 600, 1200, 1000, 0] },
  { label: 'Старт 9%', ppv: 100, legs: [300, 300, 300, 200] },
  { label: '21%', ppv: 300, legs: [3000, 3500, 3200] },
];

export default function RewardsCalculator() {
  const [ppv, setPpv] = useState(100);
  const [cpv, setCpv] = useState(0);
  const [rate, setRate] = useState(() => Number(localStorage.getItem('amway_bv_rate')) || BV_PER_PV);
  const [pathEligible, setPathEligible] = useState(false);
  const [legs, setLegs] = useState<Leg[]>(PRESETS[0].legs.map((pv, k) => ({ name: `Гілка ${k + 1}`, pv })));
  useEffect(() => { localStorage.setItem('amway_bv_rate', String(rate)); }, [rate]);
  const r = calcRewards({ personalPv: ppv, customerPv: cpv, legs, pathEligible, bvRate: rate });
  const upd = (k: number, p: Partial<Leg>) => setLegs((l) => l.map((x, i) => (i === k ? { ...x, ...p } : x)));
  const num = (v: string) => Math.max(0, Number(v) || 0);
  const Status = ({ ok, text }: { ok: boolean; text: string }) => (
    <p className="flex items-center gap-2 text-sm">{ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}{text}</p>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => <Button key={p.label} size="sm" variant="outline" onClick={() => { setPpv(p.ppv); setCpv(0); setLegs(p.legs.map((pv, k) => ({ name: `Гілка ${k + 1}`, pv }))); }}>{p.label}</Button>)}
      </div>

      <Card className="p-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">PV за особисті покупки<Input className="h-11 mt-1" type="number" min={0} value={ppv} onChange={(e) => setPpv(num(e.target.value))} /></label>
        <label className="text-sm">PV від зареєстрованих клієнтів<Input className="h-11 mt-1" type="number" min={0} value={cpv} onChange={(e) => setCpv(num(e.target.value))} /></label>
        <label className="text-sm">Курс: BV ₴ за 1 PV<Input className="h-11 mt-1" type="number" min={0} step="0.0001" value={rate} onChange={(e) => setRate(num(e.target.value))} /></label>
        <div className="sm:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div><p className="text-muted-foreground">Групові PV</p><p className="font-bold">{r.groupPv.toLocaleString('uk-UA')}</p></div>
          <div><p className="text-muted-foreground">Групові BV</p><p className="font-bold">{money(r.groupBv)}</p></div>
          <div><p className="text-muted-foreground">Рівень кваліфікації</p><p className="font-bold text-primary">{r.pct}%</p></div>
          <div><p className="text-muted-foreground">Q-місяць</p><p className="font-bold">{r.qMonth ? 'Так' : 'Ні'}</p></div>
        </div>
      </Card>

      <Card className="p-3">
        <p className="font-medium mb-2">НПА першої лінії</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2">Гілка</th><th>Групові PV</th><th>%</th><th className="text-right">Групові BV</th><th className="text-right">Відсоткова різниця</th><th>Новий</th><th />
            </tr></thead>
            <tbody>
              {r.legs.map((l, k) => (
                <tr key={k} className="border-b border-border">
                  <td className="py-1"><Input className="h-10 w-36" value={l.name} onChange={(e) => upd(k, { name: e.target.value })} aria-label="Назва гілки" /></td>
                  <td><Input className="h-10 w-24" type="number" min={0} value={l.pv} onChange={(e) => upd(k, { pv: num(e.target.value) })} aria-label="Групові PV" /></td>
                  <td>{l.pct}%</td>
                  <td className="text-right">{money(l.bv)}</td>
                  <td className="text-right">{money(l.diff)}</td>
                  <td><Checkbox checked={!!l.isNew} onCheckedChange={(v) => upd(k, { isNew: !!v })} aria-label="Новий НПА" /></td>
                  <td><Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => setLegs((x) => x.filter((_, i) => i !== k))} aria-label="Видалити"><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button className="mt-2" size="sm" onClick={() => setLegs((x) => [...x, { name: `Гілка ${x.length + 1}`, pv: 0 }])}><Plus className="h-4 w-4 mr-1" />Додати ще одну гілку</Button>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4 space-y-2">
          <p className="font-medium">Винагорода «Шлях до Бронзи+»</p>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={pathEligible} onCheckedChange={(v) => setPathEligible(!!v)} />У період програми я був на рівні 0–12%</label>
          <Status ok={ppv >= 100} text="100 PPV" />
          <Status ok={r.newQ >= 3} text={`Нових НПА з 100 GPV: ${r.newQ} (потрібно 3–6)`} />
          <div className="flex flex-wrap gap-1">{Object.entries(PATH_TO_BRONZE).map(([n, s]) => <Badge key={n} variant={r.newQ === Number(n) ? 'default' : 'outline'}>{n}: {money(s)}</Badge>)}</div>
          <p className="text-sm font-semibold">{r.path ? money(r.path) : 'Винагорода недоступна'}</p>
        </Card>
        <Card className="p-4 space-y-2">
          <p className="font-medium">Винагороди для Бронзових НПА+</p>
          <p className="text-sm">Винагорода за досягнення: <b>{money(r.performance)}</b></p>
          <Status ok={r.foundation} text="Бронзовий Старт (+30%): ≥9%, 100 PPV, 3 гілки ≥3%" />
          <p className="text-sm pl-6">{r.foundation ? money(r.foundationSum) : 'Недоступна'}</p>
          <Status ok={r.builder} text="Бронзова винагорода (+40%): ≥15%, 100 PPV, 3 гілки ≥6%" />
          <p className="text-sm pl-6">{r.builder ? money(r.builderSum) : 'Недоступна'}</p>
        </Card>
      </div>

      <Card className="p-4 bg-primary text-primary-foreground flex flex-wrap gap-4 justify-between items-center">
        <p className="font-bold text-lg">СУКУПНИЙ ДОХІД</p>
        <div><p className="text-xs opacity-80">Місячна сума</p><p className="text-xl font-bold">{money(r.monthly)}</p></div>
        <div><p className="text-xs opacity-80">Річна сума</p><p className="text-xl font-bold">{money(r.yearly)}</p></div>
      </Card>
      <p className="text-xs text-muted-foreground">Розрахунок орієнтовний за правилами маркетинг-плану та Core Plus. Остаточні суми визначає компанія.</p>
    </div>
  );
}
