/**
 * PayoutsTab — адмін-вкладка для управління виплатами акціонерам.
 *
 * Потік: Розрахувати → Виплатити → Акціонер підтверджує (або адмін примусово).
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Calculator, DollarSign, CheckCircle2, Clock, AlertCircle, Loader2,
  Send, ShieldCheck, RefreshCw, Trash2, Layers, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  calcFullProfitDistribution,
  type ShareholderInput,
} from '@/lib/shareholderCalculations';
import { useProfitDistConfig } from '@/hooks/useProfitDistConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayoutRow {
  id: string;
  shareholder_id: string;
  amount: number;
  base_income: number;
  title_bonus: number;
  order_ids: string[];
  shares_at_calculation: number;
  share_percent_at_calculation: number;
  title_at_calculation: string | null;
  total_shares_snapshot: number;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  paid_at: string | null;
  paid_by: string | null;
  confirmed_at: string | null;
}

interface ConfirmedOrder {
  id: string;
  title: string;
  order_date: string;
  order_amount: number;
  order_expenses: number;
}

interface ShareholderData {
  userId: string;
  fullName: string;
  shares: number;
}

function fmt(n: number) { return n.toFixed(2) + ' $'; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('uk-UA'); }

function statusLabel(s: string) {
  switch (s) {
    case 'pending': return 'На виплату';
    case 'paid': return 'Виплачено';
    case 'confirmed': return 'Підтверджено';
    default: return s;
  }
}

function statusVariant(s: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (s) {
    case 'pending': return 'destructive';
    case 'paid': return 'default';
    case 'confirmed': return 'secondary';
    default: return 'outline';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

import { RepPayoutsSection } from './RepPayoutsSection';
import { SpecPayoutsSection } from './SpecPayoutsSection';

export function PayoutsTab() {
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const { config: distConfig } = useProfitDistConfig();
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [merged, setMerged] = useState(false);
  // Dialog state
  const [payDialog, setPayDialog] = useState<PayoutRow | null>(null);
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [forceDialog, setForceDialog] = useState<PayoutRow | null>(null);
  const [forceLoading, setForceLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<PayoutRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Load payouts ──────────────────────────────────────────────────────────
  const loadPayouts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shareholder_payouts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Помилка', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const rows = (data || []) as PayoutRow[];
    setPayouts(rows);

    // Load names
    const ids = [...new Set(rows.map(r => r.shareholder_id))];
    if (ids.length > 0) {
      const { data: profiles } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: ids });
      const map: Record<string, string> = {};
      if (profiles) {
        (profiles as any[]).forEach(p => { map[p.id] = p.full_name || 'Невідомий'; });
      }
      setNames(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadPayouts(); }, [loadPayouts]);

  // ── Calculate new payouts ─────────────────────────────────────────────────
  const handleCalculate = async () => {
    setCalculating(true);
    try {
      // 1. Get confirmed orders
      const { data: ordersData, error: oErr } = await supabase
        .rpc('get_confirmed_orders_for_forecast');
      if (oErr) throw oErr;
      const orders = (ordersData || []) as ConfirmedOrder[];
      if (orders.length === 0) {
        toast({ title: 'Немає підтверджених замовлень' });
        setCalculating(false);
        return;
      }

      // 2. Get already paid-out order IDs per shareholder
      const { data: existingPayouts } = await supabase
        .from('shareholder_payouts')
        .select('shareholder_id, order_ids');
      
      const paidOrdersMap: Record<string, Set<string>> = {};
      if (existingPayouts) {
        for (const ep of existingPayouts as any[]) {
          if (!paidOrdersMap[ep.shareholder_id]) paidOrdersMap[ep.shareholder_id] = new Set();
          for (const oid of (ep.order_ids || [])) paidOrdersMap[ep.shareholder_id].add(oid);
        }
      }

      // 3. Get shareholders data
      const { data: sharesData } = await supabase.rpc('get_all_shareholders_shares');
      if (!sharesData || sharesData.length === 0) {
        toast({ title: 'Немає акціонерів у системі' });
        setCalculating(false);
        return;
      }

      // 4. Get company settings
      const { data: cs } = await supabase
        .from('company_settings')
        .select('total_shares')
        .limit(1)
        .single();
      const totalShares = cs?.total_shares ?? 0;
      if (totalShares <= 0) {
        toast({ title: 'Загальну кількість акцій не налаштовано', variant: 'destructive' });
        setCalculating(false);
        return;
      }

      // 5. Get shareholder names
      const shIds = sharesData.map((s: any) => s.user_id);
      const { data: profiles } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: shIds });
      const nameMap: Record<string, string> = {};
      if (profiles) (profiles as any[]).forEach((p: any) => { nameMap[p.id] = p.full_name || 'Невідомий'; });

      const shareholders: (ShareholderData & { input: ShareholderInput })[] = sharesData.map((s: any) => ({
        userId: s.user_id,
        fullName: nameMap[s.user_id] || 'Невідомий',
        shares: s.quantity,
        input: { userId: s.user_id, shares: s.quantity },
      }));

      // 6. For each shareholder, find NEW orders not yet paid out
      const newPayouts: Omit<PayoutRow, 'id' | 'created_at' | 'paid_at' | 'paid_by' | 'confirmed_at' | 'reminder_sent_at'>[] = [];

      for (const sh of shareholders) {
        const paidOrders = paidOrdersMap[sh.userId] || new Set<string>();
        const newOrders = orders.filter(o => !paidOrders.has(o.id));
        if (newOrders.length === 0) continue;

        // Calculate total income across new orders
        let totalBase = 0;
        let totalTitleBonus = 0;

        for (const order of newOrders) {
          const dist = calcFullProfitDistribution(
            order.order_amount,
            order.order_expenses,
            shareholders.map(s => s.input),
            totalShares,
            distConfig,
          );
          const shResult = dist.shareholders.find(r => r.userId === sh.userId);
          if (shResult) {
            totalBase += shResult.baseIncome;
            totalTitleBonus += shResult.titleBonus;
          }
        }

        const totalAmount = totalBase + totalTitleBonus;
        if (totalAmount <= 0) continue;

        const percent = totalShares > 0 ? (sh.shares / totalShares) * 100 : 0;
        const { getTitleByPercent } = await import('@/lib/shareholderRules');
        const title = getTitleByPercent(percent);

        newPayouts.push({
          shareholder_id: sh.userId,
          amount: Math.round(totalAmount * 100) / 100,
          base_income: Math.round(totalBase * 100) / 100,
          title_bonus: Math.round(totalTitleBonus * 100) / 100,
          order_ids: newOrders.map(o => o.id),
          shares_at_calculation: sh.shares,
          share_percent_at_calculation: Math.round(percent * 100) / 100,
          title_at_calculation: title?.title ?? null,
          total_shares_snapshot: totalShares,
          status: 'pending',
          notes: `Розрахунок за ${newOrders.length} замовлень`,
          admin_notes: null,
        });
      }

      if (newPayouts.length === 0) {
        toast({ title: 'Немає нових замовлень для розрахунку', description: 'Усі підтверджені замовлення вже враховані.' });
        setCalculating(false);
        return;
      }

      // 7. Insert payouts
      const { error: insertErr } = await supabase
        .from('shareholder_payouts')
        .insert(newPayouts as any);

      if (insertErr) throw insertErr;

      toast({ title: 'Розраховано', description: `Створено ${newPayouts.length} виплат` });
      await loadPayouts();
    } catch (err: any) {
      toast({ title: 'Помилка розрахунку', description: err.message, variant: 'destructive' });
    }
    setCalculating(false);
  };

  // ── Mark as paid ──────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!payDialog) return;
    setPayLoading(true);
    try {
      const { error } = await supabase.rpc('mark_payout_paid', {
        _payout_id: payDialog.id,
        _admin_notes: payNotes || null,
      } as any);
      if (error) throw error;
      toast({ title: 'Виплату відмічено' });
      setPayDialog(null);
      setPayNotes('');
      await loadPayouts();
    } catch (err: any) {
      toast({ title: 'Помилка', description: err.message, variant: 'destructive' });
    }
    setPayLoading(false);
  };

  // ── Force confirm ─────────────────────────────────────────────────────────
  const handleForceConfirm = async () => {
    if (!forceDialog) return;
    setForceLoading(true);
    try {
      const { error } = await supabase.rpc('admin_force_confirm_payout', {
        _payout_id: forceDialog.id,
      } as any);
      if (error) throw error;
      toast({ title: 'Виплату підтверджено адміном' });
      setForceDialog(null);
      await loadPayouts();
    } catch (err: any) {
      toast({ title: 'Помилка', description: err.message, variant: 'destructive' });
    }
    setForceLoading(false);
  };

  // ── Filtered lists ────────────────────────────────────────────────────────
  const pending = useMemo(() => payouts.filter(p => p.status === 'pending'), [payouts]);
  const paid = useMemo(() => payouts.filter(p => p.status === 'paid'), [payouts]);
  const confirmed = useMemo(() => payouts.filter(p => p.status === 'confirmed'), [payouts]);

  const totals = useMemo(() => ({
    pending: pending.reduce((s, p) => s + p.amount, 0),
    paid: paid.reduce((s, p) => s + p.amount, 0),
    confirmed: confirmed.reduce((s, p) => s + p.amount, 0),
  }), [pending, paid, confirmed]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Виплати акціонерам</h2>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={merged ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMerged(!merged)}
          >
            <Layers className="h-4 w-4 mr-1" />
            {merged ? 'Розгорнути виплати' : "Об'єднати виплати"}
          </Button>
          <Button variant="outline" size="sm" onClick={loadPayouts} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Оновити
          </Button>
          <Button size="sm" onClick={handleCalculate} disabled={calculating}>
            {calculating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Calculator className="h-4 w-4 mr-1" />}
            Розрахувати виплати
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <Clock className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">На виплату</p>
              <p className="text-lg font-bold">{fmt(totals.pending)}</p>
              <p className="text-xs text-muted-foreground">{pending.length} виплат</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Виплачено (очікує підтвердження)</p>
              <p className="text-lg font-bold">{fmt(totals.paid)}</p>
              <p className="text-xs text-muted-foreground">{paid.length} виплат</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Підтверджено</p>
              <p className="text-lg font-bold">{fmt(totals.confirmed)}</p>
              <p className="text-xs text-muted-foreground">{confirmed.length} виплат</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            На виплату {pending.length > 0 && <Badge variant="destructive" className="ml-1 text-xs">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="paid">
            Виплачено {paid.length > 0 && <Badge variant="default" className="ml-1 text-xs">{paid.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="confirmed">Підтверджено</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <PayoutTable
            payouts={pending}
            names={names}
            loading={loading}
            merged={merged}
            emptyText="Немає очікуваних виплат. Натисніть «Розрахувати виплати» для створення."
            actions={(p) => (
              <Button size="sm" onClick={() => { setPayDialog(p); setPayNotes(''); }}>
                <Send className="h-3.5 w-3.5 mr-1" />
                Виплатити
              </Button>
            )}
          />
        </TabsContent>

        <TabsContent value="paid">
          <PayoutTable
            payouts={paid}
            names={names}
            loading={loading}
            merged={merged}
            emptyText="Немає виплат, що очікують підтвердження від акціонерів."
            actions={(p) => (
              <Button size="sm" variant="outline" onClick={() => setForceDialog(p)}>
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                Підтвердити за інвестора
              </Button>
            )}
          />
        </TabsContent>

        <TabsContent value="confirmed">
          <PayoutTable
            payouts={confirmed}
            names={names}
            loading={loading}
            merged={merged}
            emptyText="Ще немає підтверджених виплат."
            actions={(p) => (
              <Button size="sm" variant="ghost" onClick={() => setDeleteDialog(p)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* Pay dialog */}
      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Підтвердити виплату</DialogTitle>
            <DialogDescription>
              Виплата для {payDialog ? names[payDialog.shareholder_id] || 'акціонера' : ''}
            </DialogDescription>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Сума:</span> <strong>{fmt(payDialog.amount)}</strong></div>
                <div><span className="text-muted-foreground">Базовий:</span> {fmt(payDialog.base_income)}</div>
                <div><span className="text-muted-foreground">Титульний:</span> {fmt(payDialog.title_bonus)}</div>
                <div><span className="text-muted-foreground">Замовлень:</span> {payDialog.order_ids.length}</div>
              </div>
              <Separator />
              <Textarea
                placeholder="Нотатки (опційно)"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Скасувати</Button>
            <Button onClick={handlePay} disabled={payLoading}>
              {payLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Виплатити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force confirm dialog */}
      <Dialog open={!!forceDialog} onOpenChange={() => setForceDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Підтвердити за інвестора</DialogTitle>
            <DialogDescription>
              {forceDialog ? `${names[forceDialog.shareholder_id] || 'Акціонер'} — ${fmt(forceDialog.amount)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Якщо інвестор не підтверджує отримання, ви можете підтвердити виплату вручну.
            Ця дія буде записана в системі.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForceDialog(null)}>Скасувати</Button>
            <Button onClick={handleForceConfirm} disabled={forceLoading}>
              {forceLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
              Підтвердити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmed payout dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Видалити виплату</DialogTitle>
            <DialogDescription>
              {deleteDialog ? `${names[deleteDialog.shareholder_id] || 'Акціонер'} — ${fmt(deleteDialog.amount)}. Цю дію не можна скасувати.` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Скасувати</Button>
            <Button variant="destructive" disabled={deleteLoading} onClick={async () => {
              if (!deleteDialog) return;
              setDeleteLoading(true);
              const { error } = await supabase.from('shareholder_payouts').delete().eq('id', deleteDialog.id);
              if (error) {
                toast({ title: 'Помилка', description: error.message, variant: 'destructive' });
              } else {
                toast({ title: 'Виплату видалено' });
                setDeleteDialog(null);
                await loadPayouts();
              }
              setDeleteLoading(false);
            }}>
              {deleteLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Видалити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Representative Payouts Section */}
      <Separator className="my-8" />
      <RepPayoutsSection />

      {/* Specialist Payouts Section */}
      <Separator className="my-8" />
      <SpecPayoutsSection />
    </div>
  );
}

// ─── PayoutTable sub-component ──────────────────────────────────────────────

function PayoutTable({
  payouts, names, loading, emptyText, actions, merged,
}: {
  payouts: PayoutRow[];
  names: Record<string, string>;
  loading: boolean;
  emptyText: string;
  merged?: boolean;
  actions?: (p: PayoutRow) => React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Завантаження…
      </div>
    );
  }

  if (payouts.length === 0) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground text-sm">
        <AlertCircle className="h-4 w-4" /> {emptyText}
      </div>
    );
  }

  if (!merged) {
    return (
      <div className="rounded-lg border divide-y">
        {payouts.map((p) => (
          <PayoutRow key={p.id} p={p} names={names} actions={actions} />
        ))}
      </div>
    );
  }

  // Grouped/merged view
  const grouped = new Map<string, PayoutRow[]>();
  for (const p of payouts) {
    const list = grouped.get(p.shareholder_id) || [];
    list.push(p);
    grouped.set(p.shareholder_id, list);
  }

  return (
    <div className="rounded-lg border divide-y">
      {Array.from(grouped.entries()).map(([shId, items]) => {
        const totalAmount = items.reduce((s, i) => s + i.amount, 0);
        const totalBase = items.reduce((s, i) => s + i.base_income, 0);
        const totalTitleBonus = items.reduce((s, i) => s + i.title_bonus, 0);
        const totalOrders = items.reduce((s, i) => s + i.order_ids.length, 0);
        const latest = items[0];

        return (
          <Collapsible key={shId}>
            <CollapsibleTrigger asChild>
              <div className="p-3 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{names[shId] || 'Невідомий'}</span>
                    <Badge variant={statusVariant(latest.status)} className="text-xs">
                      {statusLabel(latest.status)}
                    </Badge>
                    {latest.title_at_calculation && (
                      <Badge variant="outline" className="text-xs">{latest.title_at_calculation}</Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">{items.length} виплат</Badge>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span>Базовий: {fmt(totalBase)}</span>
                    <span>Титульний: {fmt(totalTitleBonus)}</span>
                    <span>{latest.shares_at_calculation} акц. ({latest.share_percent_at_calculation}%)</span>
                    <span>{totalOrders} замовл.</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-primary whitespace-nowrap">{fmt(totalAmount)}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t bg-muted/30 divide-y">
                {items.map((p) => (
                  <PayoutRow key={p.id} p={p} names={names} actions={actions} nested />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

function PayoutRow({
  p, names, actions, nested,
}: {
  p: PayoutRow;
  names: Record<string, string>;
  actions?: (p: PayoutRow) => React.ReactNode;
  nested?: boolean;
}) {
  return (
    <div className={`p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${nested ? 'pl-6' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{names[p.shareholder_id] || 'Невідомий'}</span>
          <Badge variant={statusVariant(p.status)} className="text-xs">
            {statusLabel(p.status)}
          </Badge>
          {p.title_at_calculation && (
            <Badge variant="outline" className="text-xs">{p.title_at_calculation}</Badge>
          )}
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
          <span>Базовий: {fmt(p.base_income)}</span>
          <span>Титульний: {fmt(p.title_bonus)}</span>
          <span>{p.shares_at_calculation} акц. ({p.share_percent_at_calculation}%)</span>
          <span>{p.order_ids.length} замовл.</span>
          <span>{fmtDate(p.created_at)}</span>
          {p.paid_at && <span>Виплачено: {fmtDate(p.paid_at)}</span>}
          {p.confirmed_at && <span>Підтв: {fmtDate(p.confirmed_at)}</span>}
        </div>
        {p.admin_notes && (
          <p className="text-xs text-muted-foreground mt-1 italic">{p.admin_notes}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-primary whitespace-nowrap">{fmt(p.amount)}</span>
        {actions && actions(p)}
      </div>
    </div>
  );
}
