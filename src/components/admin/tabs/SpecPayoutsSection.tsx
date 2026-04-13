/**
 * SpecPayoutsSection — секція виплат фахівцям в адмін-панелі.
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
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DollarSign, CheckCircle2, Clock, AlertCircle, Loader2,
  Send, ShieldCheck, RefreshCw, Trash2, Wrench, Layers, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SpecPayoutRow {
  id: string;
  specialist_id: string;
  amount: number;
  order_id: string;
  role_at_calculation: string | null;
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

export function SpecPayoutsSection() {
  const [payouts, setPayouts] = useState<SpecPayoutRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [orderTitles, setOrderTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [merged, setMerged] = useState(false);

  const [payDialog, setPayDialog] = useState<SpecPayoutRow | null>(null);
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [forceDialog, setForceDialog] = useState<SpecPayoutRow | null>(null);
  const [forceLoading, setForceLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<SpecPayoutRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('specialist_payouts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Помилка', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const rows = (data || []) as SpecPayoutRow[];
    setPayouts(rows);

    // Load specialist names
    const ids = [...new Set(rows.map(r => r.specialist_id))];
    if (ids.length > 0) {
      const { data: profiles } = await supabase.rpc('get_safe_public_profiles_by_ids', { _ids: ids });
      const map: Record<string, string> = {};
      if (profiles) {
        (profiles as any[]).forEach(p => { map[p.id] = p.full_name || 'Невідомий'; });
      }
      setNames(map);
    }

    // Load order titles
    const orderIds = [...new Set(rows.map(r => r.order_id))];
    if (orderIds.length > 0) {
      const { data: orders } = await (supabase as any)
        .from('specialist_orders')
        .select('id, title')
        .in('id', orderIds);
      const oMap: Record<string, string> = {};
      if (orders) {
        (orders as any[]).forEach((o: any) => { oMap[o.id] = o.title; });
      }
      setOrderTitles(oMap);
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadPayouts(); }, [loadPayouts]);

  const handlePay = async () => {
    if (!payDialog) return;
    setPayLoading(true);
    try {
      const { error } = await supabase.rpc('mark_spec_payout_paid' as any, {
        _payout_id: payDialog.id,
        _admin_notes: payNotes || null,
      });
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
      const { error } = await supabase.rpc('admin_force_confirm_spec_payout' as any, {
        _payout_id: forceDialog.id,
      });
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

  const renderTable = (list: SpecPayoutRow[], emptyText: string, actions?: (p: SpecPayoutRow) => React.ReactNode) => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Завантаження…
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground text-sm">
          <AlertCircle className="h-4 w-4" /> {emptyText}
        </div>
      );
    }

    if (!merged) {
      return (
        <div className="rounded-lg border divide-y">
          {list.map((p) => (
            <SpecPayoutRowItem key={p.id} p={p} names={names} orderTitles={orderTitles} actions={actions} />
          ))}
        </div>
      );
    }

    // Grouped by specialist
    const grouped = new Map<string, SpecPayoutRow[]>();
    for (const p of list) {
      const items = grouped.get(p.specialist_id) || [];
      items.push(p);
      grouped.set(p.specialist_id, items);
    }

    return (
      <div className="rounded-lg border divide-y">
        {Array.from(grouped.entries()).map(([specId, items]) => {
          const totalAmount = items.reduce((s, i) => s + i.amount, 0);
          const latest = items[0];

          return (
            <Collapsible key={specId}>
              <CollapsibleTrigger asChild>
                <div className="p-3 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{names[specId] || 'Невідомий'}</span>
                      <Badge variant={statusVariant(latest.status)} className="text-xs">
                        {statusLabel(latest.status)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">{items.length} виплат</Badge>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span>{items.length} замовл.</span>
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
                    <SpecPayoutRowItem key={p.id} p={p} names={names} orderTitles={orderTitles} actions={actions} nested />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Виплати фахівцям
        </h2>
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
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Виплати фахівцям створюються адміністратором у вікні замовлення (розподіл пулу фахівців).
      </p>

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
              <p className="text-xs text-muted-foreground">Виплачено</p>
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
          {renderTable(pending, 'Немає очікуваних виплат. Розподіліть кошти фахівцям у вікні замовлення.', (p) => (
            <Button size="sm" onClick={() => { setPayDialog(p); setPayNotes(''); }}>
              <Send className="h-3.5 w-3.5 mr-1" />
              Виплатити
            </Button>
          ))}
        </TabsContent>

        <TabsContent value="paid">
          {renderTable(paid, 'Немає виплат, що очікують підтвердження від фахівців.', (p) => (
            <Button size="sm" variant="outline" onClick={() => setForceDialog(p)}>
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              Підтвердити за фахівця
            </Button>
          ))}
        </TabsContent>

        <TabsContent value="confirmed">
          {renderTable(confirmed, 'Ще немає підтверджених виплат.', (p) => (
            <Button size="sm" variant="ghost" onClick={() => setDeleteDialog(p)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          ))}
        </TabsContent>
      </Tabs>

      {/* Pay dialog */}
      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Підтвердити виплату</DialogTitle>
            <DialogDescription>
              Виплата для {payDialog ? names[payDialog.specialist_id] || 'фахівця' : ''}
            </DialogDescription>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Сума:</span> <strong>{fmt(payDialog.amount)}</strong></div>
                <div><span className="text-muted-foreground">Замовлення:</span> {orderTitles[payDialog.order_id] || payDialog.order_id.slice(0, 8)}</div>
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
            <DialogTitle>Підтвердити за фахівця</DialogTitle>
            <DialogDescription>
              {forceDialog ? `${names[forceDialog.specialist_id] || 'Фахівець'} — ${fmt(forceDialog.amount)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Якщо фахівець не підтверджує отримання, ви можете підтвердити виплату вручну.
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
              {deleteDialog ? `${names[deleteDialog.specialist_id] || 'Фахівець'} — ${fmt(deleteDialog.amount)}. Цю дію не можна скасувати.` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Скасувати</Button>
            <Button variant="destructive" disabled={deleteLoading} onClick={async () => {
              if (!deleteDialog) return;
              setDeleteLoading(true);
              const { error } = await (supabase as any).from('specialist_payouts').delete().eq('id', deleteDialog.id);
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

function SpecPayoutRowItem({
  p, names, orderTitles, actions, nested,
}: {
  p: SpecPayoutRow;
  names: Record<string, string>;
  orderTitles: Record<string, string>;
  actions?: (p: SpecPayoutRow) => React.ReactNode;
  nested?: boolean;
}) {
  return (
    <div className={`p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${nested ? 'pl-6' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{names[p.specialist_id] || 'Невідомий'}</span>
          <Badge variant={statusVariant(p.status)} className="text-xs">
            {statusLabel(p.status)}
          </Badge>
          {p.role_at_calculation && (
            <Badge variant="outline" className="text-xs">{p.role_at_calculation}</Badge>
          )}
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
          <span>Замовлення: {orderTitles[p.order_id] || p.order_id.slice(0, 8)}</span>
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
