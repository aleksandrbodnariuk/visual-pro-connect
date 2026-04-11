/**
 * RepPayoutsSection — секція виплат представникам в адмін-панелі.
 * Логіка аналогічна до виплат акціонерам.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Calculator, DollarSign, CheckCircle2, Clock, AlertCircle, Loader2,
  Send, ShieldCheck, RefreshCw, Trash2, Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface RepPayoutRow {
  id: string;
  representative_id: string;
  amount: number;
  order_ids: string[];
  role_at_calculation: string | null;
  percent_at_calculation: number;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  paid_at: string | null;
  paid_by: string | null;
  confirmed_at: string | null;
}

function fmt(n: number) { return n.toFixed(2) + ' $'; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('uk-UA'); }

const ROLE_LABELS: Record<string, string> = {
  representative: 'Представник',
  manager: 'Менеджер',
  director: 'Директор',
};

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

export function RepPayoutsSection() {
  const [payouts, setPayouts] = useState<RepPayoutRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  const [payDialog, setPayDialog] = useState<RepPayoutRow | null>(null);
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [forceDialog, setForceDialog] = useState<RepPayoutRow | null>(null);
  const [forceLoading, setForceLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<RepPayoutRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('representative_payouts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Помилка', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const rows = (data || []) as RepPayoutRow[];
    setPayouts(rows);

    const ids = [...new Set(rows.map(r => r.representative_id))];
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

  // ── Calculate new payouts from representative_earnings ───────────────────
  const handleCalculate = async () => {
    setCalculating(true);
    try {
      // 1. Get all representative earnings
      const { data: earningsData, error: eErr } = await supabase
        .from('representative_earnings')
        .select('representative_id, order_id, amount, percent, role_snapshot, created_at');
      if (eErr) throw eErr;
      if (!earningsData || earningsData.length === 0) {
        toast({ title: 'Немає нарахувань представникам' });
        setCalculating(false);
        return;
      }

      // 2. Get representatives with user_ids
      const repIds = [...new Set(earningsData.map(e => e.representative_id))];
      const { data: repsData } = await supabase
        .from('representatives')
        .select('id, user_id, role')
        .in('id', repIds);
      
      if (!repsData || repsData.length === 0) {
        toast({ title: 'Немає представників у системі' });
        setCalculating(false);
        return;
      }

      const repUserMap: Record<string, { userId: string; role: string }> = {};
      for (const r of repsData) {
        repUserMap[r.id] = { userId: r.user_id, role: r.role };
      }

      // 3. Get already paid-out order IDs per representative (by user_id)
      const { data: existingPayouts } = await supabase
        .from('representative_payouts')
        .select('representative_id, order_ids');

      const paidOrdersMap: Record<string, Set<string>> = {};
      if (existingPayouts) {
        for (const ep of existingPayouts as any[]) {
          if (!paidOrdersMap[ep.representative_id]) paidOrdersMap[ep.representative_id] = new Set();
          for (const oid of (ep.order_ids || [])) paidOrdersMap[ep.representative_id].add(oid);
        }
      }

      // 4. Group earnings by user_id, filter out already paid orders
      const userEarnings: Record<string, {
        totalAmount: number;
        orderIds: Set<string>;
        role: string;
        percent: number;
      }> = {};

      for (const earning of earningsData) {
        const rep = repUserMap[earning.representative_id];
        if (!rep) continue;

        const userId = rep.userId;
        const paidOrders = paidOrdersMap[userId] || new Set<string>();
        if (paidOrders.has(earning.order_id)) continue;

        if (!userEarnings[userId]) {
          userEarnings[userId] = { totalAmount: 0, orderIds: new Set(), role: rep.role, percent: Number(earning.percent) };
        }
        userEarnings[userId].totalAmount += Number(earning.amount);
        userEarnings[userId].orderIds.add(earning.order_id);
      }

      // 5. Build payouts
      const newPayouts: any[] = [];
      for (const [userId, data] of Object.entries(userEarnings)) {
        if (data.totalAmount <= 0 || data.orderIds.size === 0) continue;
        newPayouts.push({
          representative_id: userId,
          amount: Math.round(data.totalAmount * 100) / 100,
          order_ids: Array.from(data.orderIds),
          role_at_calculation: data.role,
          percent_at_calculation: data.percent,
          status: 'pending',
          notes: `Розрахунок за ${data.orderIds.size} замовлень`,
        });
      }

      if (newPayouts.length === 0) {
        toast({ title: 'Немає нових нарахувань для розрахунку', description: 'Усі нарахування вже враховані.' });
        setCalculating(false);
        return;
      }

      const { error: insertErr } = await supabase
        .from('representative_payouts')
        .insert(newPayouts);

      if (insertErr) throw insertErr;

      toast({ title: 'Розраховано', description: `Створено ${newPayouts.length} виплат` });
      await loadPayouts();
    } catch (err: any) {
      toast({ title: 'Помилка розрахунку', description: err.message, variant: 'destructive' });
    }
    setCalculating(false);
  };

  const handlePay = async () => {
    if (!payDialog) return;
    setPayLoading(true);
    try {
      const { error } = await supabase.rpc('mark_rep_payout_paid', {
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

  const handleForceConfirm = async () => {
    if (!forceDialog) return;
    setForceLoading(true);
    try {
      const { error } = await supabase.rpc('admin_force_confirm_rep_payout', {
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

  const pending = useMemo(() => payouts.filter(p => p.status === 'pending'), [payouts]);
  const paid = useMemo(() => payouts.filter(p => p.status === 'paid'), [payouts]);
  const confirmed = useMemo(() => payouts.filter(p => p.status === 'confirmed'), [payouts]);

  const totals = useMemo(() => ({
    pending: pending.reduce((s, p) => s + p.amount, 0),
    paid: paid.reduce((s, p) => s + p.amount, 0),
    confirmed: confirmed.reduce((s, p) => s + p.amount, 0),
  }), [pending, paid, confirmed]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Виплати представникам
        </h2>
        <div className="flex gap-2">
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
          <RepPayoutTable
            payouts={pending}
            names={names}
            loading={loading}
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
          <RepPayoutTable
            payouts={paid}
            names={names}
            loading={loading}
            emptyText="Немає виплат, що очікують підтвердження від представників."
            actions={(p) => (
              <Button size="sm" variant="outline" onClick={() => setForceDialog(p)}>
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                Підтвердити за представника
              </Button>
            )}
          />
        </TabsContent>

        <TabsContent value="confirmed">
          <RepPayoutTable
            payouts={confirmed}
            names={names}
            loading={loading}
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
              Виплата для {payDialog ? names[payDialog.representative_id] || 'представника' : ''}
            </DialogDescription>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Сума:</span> <strong>{fmt(payDialog.amount)}</strong></div>
                <div><span className="text-muted-foreground">Роль:</span> {ROLE_LABELS[payDialog.role_at_calculation || ''] || payDialog.role_at_calculation}</div>
                <div><span className="text-muted-foreground">Відсоток:</span> {payDialog.percent_at_calculation}%</div>
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
            <DialogTitle>Підтвердити за представника</DialogTitle>
            <DialogDescription>
              {forceDialog ? `${names[forceDialog.representative_id] || 'Представник'} — ${fmt(forceDialog.amount)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Якщо представник не підтверджує отримання, ви можете підтвердити виплату вручну.
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

      {/* Delete dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Видалити виплату</DialogTitle>
            <DialogDescription>
              {deleteDialog ? `${names[deleteDialog.representative_id] || 'Представник'} — ${fmt(deleteDialog.amount)}. Цю дію не можна скасувати.` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Скасувати</Button>
            <Button variant="destructive" disabled={deleteLoading} onClick={async () => {
              if (!deleteDialog) return;
              setDeleteLoading(true);
              const { error } = await supabase.from('representative_payouts').delete().eq('id', deleteDialog.id);
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
    </div>
  );
}

// ─── RepPayoutTable sub-component ───────────────────────────────────────────

function RepPayoutTable({
  payouts, names, loading, emptyText, actions,
}: {
  payouts: RepPayoutRow[];
  names: Record<string, string>;
  loading: boolean;
  emptyText: string;
  actions?: (p: RepPayoutRow) => React.ReactNode;
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

  return (
    <div className="rounded-lg border divide-y">
      {payouts.map((p) => (
        <div key={p.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{names[p.representative_id] || 'Невідомий'}</span>
              <Badge variant={statusVariant(p.status)} className="text-xs">
                {statusLabel(p.status)}
              </Badge>
              {p.role_at_calculation && (
                <Badge variant="outline" className="text-xs">
                  {ROLE_LABELS[p.role_at_calculation] || p.role_at_calculation}
                </Badge>
              )}
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
              <span>{p.percent_at_calculation}%</span>
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
      ))}
    </div>
  );
}
